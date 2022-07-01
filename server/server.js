const express = require('express')
const cors = require("cors")
const session = require('express-session') //auth
const passport = require('passport') //auth
const { Pool } = require('pg')
require('./auth') //auth

const app = express()

app.use(express.json())
app.use(cors())
app.use(session({ secret: 'cats' })) //auth
app.use(passport.initialize()) //auth
app.use(passport.session()) //auth


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

const port = process.env.PORT || 5000

app.listen(port, function () {
  console.log(`Server is listening on port ${port}. Ready to accept requests!`)
})

app.get('/', function (req, res) {
  pool
    .query('SELECT * FROM hotels')
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

// hotels
app.get('/hotels', function (req, res) {
  pool
    .query('SELECT * FROM hotels')
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

app.get('/hotels/:hotelId', function (req, res) {
  const hotelId = req.params.hotelId

  pool
    .query('SELECT * FROM hotels WHERE id=$1', [hotelId])
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

app.get('/search', function (req, res) {
  const hotelNameQuery = req.query.name
  let query = `SELECT * FROM hotels ORDER BY name`
  let params = []
  if (hotelNameQuery) {
    query = `SELECT * FROM hotels WHERE name LIKE $1 ORDER BY name`
    params.push(`%${hotelNameQuery}%`)
  }

  pool
    .query(query, params)
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

app.post('/hotels', function (req, res) {
  const newHotelName = req.body.name
  const newHotelRooms = req.body.rooms
  const newHotelPostcode = req.body.postcode

  if (!Number.isInteger(newHotelRooms) || newHotelRooms <= 0) {
    return res
      .status(400)
      .send('The number of rooms should be a positive integer.')
  }

  if (!newHotelName.length > 0) {
    return res.status(400).send('The name of hotel should be a string.')
  }

  const query = 'INSERT INTO hotels (name, rooms, postcode) VALUES ($1, $2, $3)'

  pool
    .query(query, [newHotelName, newHotelRooms, newHotelPostcode])
    .then(() => res.send('Hotel created!'))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

app.put('/hotels/:hotelId', function (req, res) {
  const hotelId = req.params.hotelId
  const newName = req.body.name

  if (!newName.length > 0) {
    return res.status(400).send('The name of hotel should be a string.')
  }

  pool
    .query('UPDATE hotels SET name=$1 WHERE id=$2', [newName, hotelId])
    .then(() => res.send(`Hotel ${hotelId} updated!`))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

app.delete('/hotels/:hotelId', function (req, res) {
  const hotelId = req.params.hotelId

  pool
    .query('DELETE FROM bookings WHERE hotel_id=$1', [hotelId])
    .then(() => pool.query('DELETE FROM hotels WHERE id=$1', [hotelId]))
    .then(() => res.send(`Hotel ${hotelId} deleted!`))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

// customers
app.get('/customers', function (req, res) {
  pool
    .query('SELECT * FROM customers ORDER BY name')
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})

app.get('/customers/:customerId', (req, res) => {
  const id = req.params.customerId
  pool
    .query(`Select * from customers where id = $1`, [id])
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.log(error)
      res.status(400).json(error)
    })
})

app.get('/customers/:customerId/bookings', (req, res) => {
  const id = req.params.customerId
  const queryString = ` Select * from customers 
                        inner join bookings on customer_id = customers.id
                        where customers.id = $1`
  pool
    .query(queryString, [id])
    .then((result) => res.json(result.rows))
    .catch((error) => {
      console.log(error)
      res.status(400).json(error)
    })
})

app.post('/customers', (req, res) => {
  const {
    customerName,
    customerEmail,
    customerAddress,
    customerCity,
    customerPostcode,
    customerCountry,
  } = req.body
  const queryString = `INSERT INTO customers 
                        (name, email, address, city, postcode, country) 
                        VALUES ($1, $2, $3, $4, $5, $6)`
  const params = [
    customerName,
    customerEmail,
    customerAddress,
    customerCity,
    customerPostcode,
    customerCountry,
  ]

  Pool.query(queryString, params)
    .then(() => res.status(200).send('Customer created!'))
    .catch((error) => {
      console.log(error)
      res.status(400).json(error)
    })
})

app.put('/customers/:customerId', (req, res) => {
  const id = req.params.customerId
  const { email } = req.body
  const queryString = `Update customers Set email=${email} where id = ${id}`

  pool
    .query(queryString)
    .then(() => res.status(200).send('Customer updated!'))
    .catch((error) => {
      console.error(error)
      res.status(500).json(error)
    })
})


//----- Google Authentication -------//

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401)
}

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] }),
)

app.get(
  '/google/callback',
  passport.authenticate('google', {
    successRedirect: '/protected',
    failureRedirect: '/auth/failure',
  }),
)

app.get('/auth/failure', (req, res) => {
  res.send('something went wrong...')
})

app.get('/protected', isLoggedIn, (req, res) => {
  const { name, email, picture } = req.user;
  pool.query(`select * from users where email = $1`, [email])
  .then(result => {
    if(result.rows.length==0)
        pool.query(`Insert into users (firstname, surname, email, picture ) 
                    values ($1, $2, $3, $4)`, [name.givenName, name.familyName, email, picture])
        .then(()=> res.sendStatus(201))
        .catch(error => res.json(error))
  }).catch(error => res.json(error))

  res.send(`
    Display name: ${req.user.displayName} </br>
    First name: ${req.user.name.givenName}</br>
    Surname: ${req.user.name.familyName}</br>
    Email: ${req.user.email}</br>
    Picture: ${req.user.picture}</br>
    `)
})

app.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    res.redirect('/')
  })
})

app.get('/currentUser', (req, res) => {
    res.json(req.user);
})

//-----------------------------------//
