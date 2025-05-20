// src/components/OrderCart.jsx
import React, { useMemo } from 'react';
import { FiShoppingCart, FiTrash2, FiMinusCircle, FiPlusCircle, FiLoader } from 'react-icons/fi';

// Accept restaurantInfo object
const OrderCart = ({ cartItems, onUpdateQuantity, onPlaceOrder, isPlacingOrder, restaurantInfo, tableNumber }) => {
    const subtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    }, [cartItems]);

    const totalItems = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [cartItems]);

    if (cartItems.length === 0) {
        return null;
    }

    // Use restaurant name from info object
    const restaurantName = restaurantInfo?.name || 'the restaurant';

    return (
        <aside className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-40 max-h-[50vh] flex flex-col">
            {/* Cart Header */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FiShoppingCart className="mr-2 text-indigo-600" /> Your Order {tableNumber ? `(Table ${tableNumber})` : ''}
                </h3>
                <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Cart Items - Scrollable */}
            <div className="p-3 overflow-y-auto flex-grow">
                {cartItems.map(({ menuItem, quantity }) => (
                    <div key={menuItem._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        {/* item details and quantity buttons */}
                        <div className="flex-grow mr-2">
                            <p className="text-sm font-medium text-gray-900">{menuItem.name}</p>
                            <p className="text-xs text-gray-500">${menuItem.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                            <button onClick={() => onUpdateQuantity(menuItem._id, -1)} title="Decrease quantity" className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50" disabled={isPlacingOrder}> <FiMinusCircle className="w-5 h-5" /> </button>
                            <span className="mx-2 text-sm font-medium w-6 text-center">{quantity}</span>
                            <button onClick={() => onUpdateQuantity(menuItem._id, 1)} title="Increase quantity" className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50" disabled={isPlacingOrder}> <FiPlusCircle className="w-5 h-5" /> </button>
                            <button onClick={() => onUpdateQuantity(menuItem._id, -quantity)} title="Remove item" className="ml-2 p-1 text-gray-400 hover:text-red-600 disabled:opacity-50" disabled={isPlacingOrder}> <FiTrash2 className="w-4 h-4" /> </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cart Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                {/* subtotal  */}
                <div className="flex justify-between items-center mb-3">
                    <span className="text-md font-medium text-gray-700">Subtotal:</span>
                    <span className="text-lg font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <button
                    onClick={() => onPlaceOrder(subtotal)}
                    disabled={isPlacingOrder || cartItems.length === 0}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${isPlacingOrder || cartItems.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
                >
                    {isPlacingOrder ? (<> <FiLoader className="animate-spin h-5 w-5 mr-2" /> Placing Order... </>) : (`Place Order for ${restaurantName}`)}
                </button>
            </div>
        </aside>
    );
};

export default OrderCart;
