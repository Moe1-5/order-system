// src/pages/CartPage.jsx
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Keep for customerApi definition
import {
    FiShoppingCart, FiTrash2, FiMinusCircle, FiPlusCircle, FiLoader,
    FiArrowLeft, FiAlertCircle, FiCheckCircle, FiImage, FiX,
    FiUser, FiPhone, FiMail, FiEdit3, FiTag // Added FiTag for customizations
} from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import customerApi from '../api/customerApi';

// Axios instance specifically for customer public API calls

const CartPage = () => {
    const {
        cartItems = [],
        updateQuantity,
        removeItem,
        subtotal = 0,
        clearCart,
        totalItems = 0
    } = useCart();

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [error, setError] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(null);

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [orderNotes, setOrderNotes] = useState('');

    const { tableNumber } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const restaurantId = new URLSearchParams(location.search).get('restaurant');
    const isTableOrder = !!tableNumber;

    useEffect(() => {
        setCustomerName(localStorage.getItem('customerName') || '');
        setCustomerPhone(localStorage.getItem('customerPhone') || '');
        setCustomerEmail(localStorage.getItem('customerEmail') || '');
    }, []);

    const handlePlaceOrder = async () => {
        if (!isTableOrder && (!customerName.trim() || !customerPhone.trim())) {
            setError('Please enter your Name and Phone Number.');
            document.getElementById('customerName')?.focus();
            return;
        }
        if (!isTableOrder && !/^\+?[0-9\s\-()]{7,}$/.test(customerPhone.trim())) {
            setError('Please enter a valid Phone Number.');
            document.getElementById('customerPhone')?.focus();
            return;
        }
        if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
            setError('Please enter a valid Email address or leave it empty.');
            document.getElementById('customerEmail')?.focus();
            return;
        }
        if (cartItems.length === 0 || isPlacingOrder || !restaurantId) {
            console.warn("Order placement blocked:", { isEmpty: cartItems.length === 0, isPlacing: isPlacingOrder, noId: !restaurantId });
            return;
        }

        setIsPlacingOrder(true);
        setError(null);

        const orderData = {
            restaurantId: restaurantId,
            items: cartItems.map(cartEntry => ({
                menuItemId: cartEntry.menuItem._id,
                name: cartEntry.menuItem.name,
                quantity: cartEntry.quantity,
                priceAtOrder: cartEntry.pricePerItemWithExtras,
                selectedComponents: cartEntry.selectedComponents,
                selectedExtras: cartEntry.selectedExtras.map(ex => ({ name: ex.name, price: ex.price }))
            })),
            tableNumber: isTableOrder ? parseInt(tableNumber, 10) : undefined,
            totalAmount: subtotal,
            customerName: customerName.trim() || undefined,
            customerPhone: customerPhone.trim() || undefined,
            customerEmail: customerEmail.trim().toLowerCase() || undefined,
            notes: orderNotes.trim() || undefined,
        };

        try {
            const response = await customerApi.post('/orders', orderData);
            setOrderSuccess({
                orderId: response.data._id || response.data.orderId || 'N/A', // Use _id from response if available
                orderNumber: response.data.orderNumber || 'Unknown'
            });
            clearCart();

            if (!isTableOrder) {
                localStorage.setItem('customerName', customerName.trim());
                localStorage.setItem('customerPhone', customerPhone.trim());
                if (customerEmail.trim()) localStorage.setItem('customerEmail', customerEmail.trim()); else localStorage.removeItem('customerEmail');
            }
        } catch (err) {
            console.error("Error placing order:", err.response?.data || err.message, err);
            let specificError = "Failed to place order. Please try again.";
            if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
                specificError = err.response.data.errors.map(e => e.message || e.msg).join(' ');
            } else if (err.response?.data?.message) {
                specificError = err.response.data.message;
            } else if (err.message) {
                specificError = err.message;
            }
            setError(specificError);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (orderSuccess) {
        const menuLinkPath = tableNumber ? `/menu/table/${tableNumber}` : '/menu';
        const menuLink = `${menuLinkPath}${location.search}`; // Keep restaurant query param

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-green-50">
                <FiCheckCircle className="w-20 h-20 text-green-500 mb-5" />
                <h1 className="text-2xl font-semibold text-green-800 mb-2">Order Placed Successfully!</h1>
                <p className="text-gray-700 mb-4">Your Order Number: <span className="font-bold text-lg text-black bg-green-200 px-2 py-0.5 rounded">#{orderSuccess.orderNumber}</span></p>
                <p className="text-gray-600 mb-6 max-w-md">
                    {isTableOrder
                        ? `Your order has been sent to the kitchen for Table ${tableNumber}. Please wait for staff to serve you.`
                        : "Please show this number to the staff when collecting your order, or quote it if you have any queries."
                    }
                </p>
                <Link
                    to={menuLink}
                    className="mt-4 px-6 py-2.5 border border-green-600 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Back to Menu
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto flex items-center">
                    <button
                        onClick={() => navigate(`/menu${tableNumber ? `/table/${tableNumber}` : ''}${location.search}`)} // Navigate back to menu with params
                        className="text-gray-600 hover:text-indigo-600 mr-4 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Go back to menu"
                    >
                        <FiArrowLeft size={22} />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-800 flex items-center">
                        <FiShoppingCart className="mr-2" /> Your Order Summary
                    </h1>
                    {tableNumber && <span className="ml-auto text-sm font-semibold text-gray-700 bg-blue-100 px-2.5 py-1 rounded-full">Table {tableNumber}</span>}
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-10">
                {error && (
                    <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center justify-between space-x-2" role="alert">
                        <div className="flex items-center space-x-2">
                            <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium text-sm">{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 focus:outline-none p-1 -m-1 rounded-full hover:bg-red-200">
                            <FiX className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {cartItems.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow mt-6">
                        <FiShoppingCart className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-xl font-semibold text-gray-900">Your Cart is Empty</h3>
                        <p className="mt-2 text-sm text-gray-500"> Please add items from the menu to place an order. </p>
                        <div className="mt-6">
                            <button onClick={() => navigate(`/menu${tableNumber ? `/table/${tableNumber}` : ''}${location.search}`)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                <FiArrowLeft className="-ml-1 mr-2 h-5 w-5" /> Back to Menu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <h2 className="text-lg font-semibold p-4 border-b border-gray-200">
                            Your Items ({totalItems} Item{totalItems !== 1 ? 's' : ''})
                        </h2>
                        <ul className="divide-y divide-gray-200">
                            {cartItems.map((cartEntry) => {
                                const { menuItem, quantity, selectedComponents, selectedExtras, pricePerItemWithExtras, cartId } = cartEntry;
                                const defaultComponents = menuItem.components || [];

                                return (
                                    <li key={cartId} className="flex items-start py-4 px-4 sm:px-6 gap-3 sm:gap-4">
                                        <div className="h-20 w-20 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                                            {menuItem.imageUrl ? (
                                                <img src={menuItem.imageUrl} alt={menuItem.name} className="h-full w-full object-cover rounded" />
                                            ) : (
                                                <FiImage size={32} />
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{menuItem.name}</p>
                                                    <p className="text-xs text-gray-500">${pricePerItemWithExtras.toFixed(2)} ea.</p>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-800 flex-shrink-0 ml-2">
                                                    ${(pricePerItemWithExtras * quantity).toFixed(2)}
                                                </span>
                                            </div>

                                            {/* Display Customizations */}
                                            {(selectedComponents.length < defaultComponents.length || (selectedExtras && selectedExtras.length > 0)) && (
                                                <div className="mt-1.5 text-xs text-gray-600 space-y-0.5">
                                                    {defaultComponents.map(comp => {
                                                        if (!selectedComponents.includes(comp)) {
                                                            return <p key={`no-${comp}`} className="italic flex items-center"><FiX className="inline mr-1 text-red-500 h-3 w-3" />No {comp}</p>;
                                                        }
                                                        return null;
                                                    })}
                                                    {selectedExtras && selectedExtras.map(extra => (
                                                        <p key={extra.name} className="italic flex items-center"><FiPlusCircle className="inline mr-1 text-green-500 h-3 w-3" />{extra.name} (+${extra.price.toFixed(2)})</p>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Quantity Controls & Remove Button */}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center">
                                                    <button onClick={() => updateQuantity(cartId, -1)} title="Decrease" className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50 rounded-full hover:bg-red-100" disabled={isPlacingOrder}> <FiMinusCircle className="w-5 h-5" /> </button>
                                                    <span className="mx-2 text-sm font-semibold w-6 text-center tabular-nums">{quantity}</span>
                                                    <button onClick={() => updateQuantity(cartId, 1)} title="Increase" className="p-1 text-gray-500 hover:text-green-600 disabled:opacity-50 rounded-full hover:bg-green-100" disabled={isPlacingOrder}> <FiPlusCircle className="w-5 h-5" /> </button>
                                                </div>
                                                <button onClick={() => removeItem(cartId)} title="Remove item" className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 rounded-full hover:bg-red-100" disabled={isPlacingOrder}> <FiTrash2 className="w-4 h-4" /> </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div id="customer-details-form" className="p-4 sm:p-6 border-t border-gray-200 space-y-4">
                            <h3 className="text-md font-semibold text-gray-800">
                                {isTableOrder ? 'Your Contact Details (Optional)' : 'Your Contact Details'}
                            </h3>
                            <div>
                                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1"> Name {!isTableOrder && <span className="text-red-500">*</span>} </label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiUser className="h-4 w-4 text-gray-400" /></div>
                                    <input type="text" name="customerName" id="customerName" required={!isTableOrder} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="Full Name" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1"> Phone {!isTableOrder && <span className="text-red-500">*</span>} </label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiPhone className="h-4 w-4 text-gray-400" /></div>
                                    <input type="tel" name="customerPhone" id="customerPhone" required={!isTableOrder} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="Phone Number" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiMail className="h-4 w-4 text-gray-400" /></div>
                                    <input type="email" name="customerEmail" id="customerEmail" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="you@example.com" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="orderNotes" className="block text-sm font-medium text-gray-700 mb-1">Order Notes (Optional)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute top-2.5 left-0 pl-3 flex items-start pointer-events-none"><FiEdit3 className="h-4 w-4 text-gray-400" /></div>
                                    <textarea id="orderNotes" name="orderNotes" rows="2" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2" placeholder="E.g., allergies, extra sauce, no pickles..."></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                            <div className="flex justify-between items-center mb-4 text-lg">
                                <span className="font-medium text-gray-800">Subtotal:</span>
                                <span className="font-bold text-gray-900">${subtotal.toFixed(2)}</span>
                            </div>
                            <button onClick={handlePlaceOrder} disabled={isPlacingOrder || cartItems.length === 0 || !restaurantId} className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${isPlacingOrder || cartItems.length === 0 || !restaurantId ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}>
                                {isPlacingOrder ? (<> <FiLoader className="animate-spin h-5 w-5 mr-2" /> Placing Order... </>) : (`Place Order (${totalItems} Item${totalItems !== 1 ? 's' : ''})`)}
                            </button>
                            {!restaurantId && <p className="text-xs text-red-600 text-center mt-2">Error: Cannot place order (missing restaurant info).</p>}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CartPage;
