// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'; // Import Link & useLocation
import Menu from './pages/Menu';
import CartPage from './pages/CartPage'; // Import CartPage
import NotFoundPage from './pages/NotFoundPage';
import './index.css';


function App() {
  return (
    <Router>
      <div className="font-sans">
        {/* Render Navbar on relevant pages (could be moved to a Layout component) */}
        {/* We need a way to conditionally render Navbar perhaps, or make it global */}
        {/* For now, let's assume MenuPage renders its own slightly different header */}
        {/* <Navbar /> */}

        <Routes>
          {/* Menu Routes */}
          <Route path="/order/table/:tableNumber" element={<Menu />} />
          <Route path="/order/general" element={<Menu />} />
          <Route path="/menu" element={<Menu />} />

          {/* Cart Route - Potentially needs tableNumber too if applicable */}
          <Route path="/cart/table/:tableNumber" element={<CartPage />} /> {/* Cart for specific table */}
          <Route path="/cart" element={<CartPage />} /> {/* General cart */}


          {/* Other Routes */}
          <Route path="/invalid-restaurant-id" element={<NotFoundPage message="Invalid Restaurant Link." />} />
          <Route path="/order/invalid-table" element={<NotFoundPage message="Invalid Table Link." />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
