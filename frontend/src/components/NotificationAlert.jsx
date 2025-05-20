// frontend/src/components/NotificationAlert.jsx
import React from 'react';
// --- Add FiCheck and FiEye ---
import { FiBell, FiCheck, FiX, FiExternalLink, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationAlert = ({ orderData, show, onDismiss }) => {
    if (!orderData) return null;

    const orderTypeLabel = orderData.orderType === 'dine-in' // Adjusted logic for label
        ? `Table ${orderData.tableNumber}`
        : `${orderData.orderType?.charAt(0).toUpperCase() + orderData.orderType?.slice(1) || 'Order'}`; // Handle dine-in vs other types
    const customerName = orderData.customerInfo?.name;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="fixed bottom-5 right-5 z-[100] w-full max-w-sm bg-white rounded-lg shadow-2xl p-4 border border-gray-200"
                >
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <FiBell className="h-6 w-6 text-blue-500 animate-pulse" />
                        </div>
                        <div className="ml-3 w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                New Order Received! (#{orderData.orderNumber})
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                                {orderTypeLabel} {customerName ? `(${customerName})` : ''} - {orderData.items?.length || 0} item(s)
                            </p>
                            {/* --- Updated Buttons --- */}
                            <div className="mt-3 flex space-x-3">
                                {/* View Order Button (Navigates and Acknowledges) */}
                                <Link
                                    to={`/orders?status=new&highlight=${orderData._id}`}
                                    onClick={() => onDismiss('acknowledge')} // <--- Signal acknowledge
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <FiEye className="mr-1.5 h-4 w-4" /> View
                                </Link>
                                {/* Acknowledge Button (Just Acknowledges and Navigates) */}
                                <button
                                    onClick={() => onDismiss('acknowledge')} // <--- Signal acknowledge
                                    title="Acknowledge and go to New Orders"
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <FiCheck className="mr-1.5 h-4 w-4 text-green-500" /> OK
                                </button>
                            </div>
                            {/* --- End Updated Buttons --- */}
                        </div>
                        <div className="ml-4 flex-shrink-0 flex">
                            <button
                                onClick={() => onDismiss('dismiss')} // <--- Signal simple dismiss
                                className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <span className="sr-only">Close</span>
                                <FiX className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NotificationAlert;
