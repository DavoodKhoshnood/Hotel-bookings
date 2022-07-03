import React, { useState } from 'react'
import Customers from '../details/Customers'
import Bookings from '../details/Bookings'
import Hotels from '../details/Hotels'
import HamburgerMenu from '../details/HamburgerMenu'
import '../../css/App.css'

function App() {
  const [detail, setDetail] = useState(<Hotels />)
  return (
    <div>
      <div className="hamburger-menu">
        <HamburgerMenu setDetail={setDetail}/>
      </div>
      <nav className="main-menu">
        <ul>
          <li onClick={() => setDetail(<Hotels />)}>Hotels</li>
          <li onClick={() => setDetail(<Customers />)}>Customers</li>
          <li onClick={() => setDetail(<Bookings />)}>Bookings</li>
        </ul>
      </nav>
      <main>{detail}</main>
      <footer>
        This is footer.
      </footer>
    </div>
  )
}

export default App
