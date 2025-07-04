// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CartProvider } from './context/CartContext.jsx' // Import CartProvider
import './index.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>,
)
