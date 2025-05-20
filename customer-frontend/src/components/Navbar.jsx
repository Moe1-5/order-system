// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'; // Import Link & useLocation
import { useCart } from './context/CartContext'; // Import useCart
import { FiShoppingCart } from 'react-icons/fi'; // Cart Icon

// Simple Navbar component to include the cart icon
const Navbar = () => {
    const { totalItems } = useCart();
    const location = useLocation(); // Get location to preserve query params

    // Preserve the restaurant query parameter when linking to cart
    const cartLink = `/cart${location.search}`;

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-20 px-4 py-2">
            <div className="container mx-auto flex justify-between items-center h-12">
                {/* Logo/Brand */}
                <Link to={`/${location.search}`} className="flex items-center space-x-2 text-indigo-600 flex-shrink-0"> {/* Link back to menu with query params */}
                    <CompanyLogoPlaceholder className="h-8 w-auto" />
                    <span className="font-bold text-lg hidden sm:inline">ScanPlate</span>
                </Link>

                {/* Cart Icon/Link */}
                <Link
                    to={cartLink} // Link to cart page with restaurant query param
                    className="relative p-2 text-gray-600 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                    aria-label={`View Cart (${totalItems} items)`}
                >
                    <FiShoppingCart size={24} />
                    {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                            {totalItems}
                        </span>
                    )}
                </Link>
            </div>
        </nav>
    );
};

export default Navbar
