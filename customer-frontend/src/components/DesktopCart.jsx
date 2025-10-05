// src/components/DesktopCart.jsx

import React from 'react';
import { useCart } from '../context/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiTrash2, FiMinusCircle, FiPlusCircle } from 'react-icons/fi';

const DesktopCart = () => {
    const { cartItems, updateQuantity, removeItem, subtotal, totalItems } = useCart();
    const location = useLocation();
    const cartLink = `/cart${location.search}`;

    return (
        <div className="lg:sticky top-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-[calc(100vh-4rem)] max-h-[800px]">
                <div className="p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Your Order</h2>
                </div>

                {cartItems.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                        <FiShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="font-semibold text-gray-700">Your cart is empty</p>
                        <p className="text-sm text-gray-500">Add items from the menu.</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto p-3 space-y-3">
                        {cartItems.map(cartEntry => {
                            const { menuItem, quantity, cartId, pricePerItemWithExtras } = cartEntry;
                            console.log("this is the cart Items:", cartItems)
                            return (
                                <div key={cartId} className="flex items-center gap-4">
                                    <img src={menuItem.image || menuItem.imageUrl} alt={menuItem.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{menuItem.name}</p>
                                        {/* --- CORRECTED LINE --- */}
                                        <p className="text-xs text-gray-500">${(menuItem.pricePerItemWithExtras || 0).toFixed(2)}</p>
                                        <div className="flex items-center mt-1">
                                            <button onClick={() => updateQuantity(cartId, -1)} className="p-1 text-gray-400 hover:text-red-500"><FiMinusCircle size={18} /></button>
                                            <span className="text-sm font-bold text-gray-800 w-6 text-center">{quantity}</span>
                                            <button onClick={() => updateQuantity(cartId, 1)} className="p-1 text-gray-400 hover:text-green-500"><FiPlusCircle size={18} /></button>
                                        </div>
                                    </div>
                                    <button onClick={() => removeItem(cartId)} className="text-gray-400 hover:text-red-600 p-1"><FiTrash2 size={16} /></button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {cartItems.length > 0 && (
                    <div className="p-5 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl">
                        <div className="flex justify-between items-center text-md font-medium mb-4">
                            <span className="text-gray-600">Subtotal:</span>
                            {/* --- CORRECTED LINE --- */}
                            <span className="text-gray-900 font-bold">${(subtotal || 0).toFixed(2)}</span>
                        </div>
                        <Link to={cartLink}>
                            <button className="w-full bg-gradient-to-r from-orange-400 to-yellow-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                                Review & Place Order ({totalItems})
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DesktopCart;
