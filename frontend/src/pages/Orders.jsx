// frontend/src/pages/Orders.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
    FiHome, FiSearch, FiFilter, FiChevronDown, FiEye, FiList, FiHelpCircle,
    FiClock, FiCheckCircle, FiLoader, FiAlertCircle, FiXCircle, FiPackage,
    FiCalendar, FiDollarSign, FiUser, FiHash, FiPhone, FiMapPin,
    FiTruck, FiShoppingBag, FiBell, FiX, FiRotateCw, FiInbox,
    FiMail, FiEdit3
} from 'react-icons/fi'; // Ensure ALL needed icons are imported
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming these exist
import ErrorMessage from '../components/ErrorMessage';


// --- Helper Functions ---
const getStatusStyles = (status) => {
    switch (status) {
        case 'new': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', icon: 'text-blue-500' };
        case 'processing': return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500', icon: 'text-yellow-500' }; // Corrected key to match backend/transitions
        case 'ready': return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500', icon: 'text-purple-500' };
        // case 'out_for_delivery': return { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-500', icon: 'text-teal-500' }; // Remove if not used
        case 'completed': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', icon: 'text-green-500' };
        case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', icon: 'text-red-500' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500', icon: 'text-gray-500' };
    }
};

const getOrderTypeDetails = (type) => {
    switch (type) {
        // case 'delivery': return { label: 'Delivery', icon: FiTruck }; // Remove if not used
        case 'pickup': return { label: 'Pickup', icon: FiShoppingBag };
        case 'dine-in': return { label: 'Dine-In', icon: FiUser }; // Changed icon
        default: return { label: type || 'Unknown', icon: FiPackage };
    }
};

const getOrderTypeStyles = (type) => {
    switch (type) {
        // case 'delivery': return { bg: 'bg-indigo-100', text: 'text-indigo-800' };
        case 'pickup': return { bg: 'bg-yellow-100', text: 'text-yellow-800' }; // Changed color
        case 'dine-in': return { bg: 'bg-blue-100', text: 'text-blue-800' }; // Changed color
        default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'new': return FiClock; // Changed icon
        case 'processing': return FiRotateCw; // Changed icon
        case 'ready': return FiPackage;
        // case 'out_for_delivery': return FiTruck;
        case 'completed': return FiCheckCircle;
        case 'cancelled': return FiXCircle; // Changed icon
        default: return FiAlertCircle;
    }
};

const getAllowedNextStatuses = (currentStatus) => {
    // Match these keys exactly with your backend logic and orderStatuses array
    const transitions = {
        'new': ['processing', 'cancelled'],
        'processing': ['ready', 'cancelled'],
        'ready': ['completed', /* 'out_for_delivery', */ 'cancelled'], // Add delivery if needed
        // 'out_for_delivery': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
    };
    return transitions[currentStatus] || [];
};


const Orders = () => {
    // === State ===
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeStatusTab, setActiveStatusTab] = useState('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);
    const [newOrderAlert, setNewOrderAlert] = useState(null); // Store data for notification
    const audioRef = useRef(null);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const highlightedOrderId = queryParams.get('highlight');
    const initialStatusFromUrl = queryParams.get('status');

    // Define order statuses for tabs using the helper function keys
    const orderStatuses = [
        { key: 'new', label: 'New', icon: getStatusIcon('new') },
        { key: 'processing', label: 'Processing', icon: getStatusIcon('processing') },
        { key: 'ready', label: 'Ready', icon: getStatusIcon('ready') },
        // { key: 'out_for_delivery', label: 'Delivery', icon: getStatusIcon('out_for_delivery') },
        { key: 'completed', label: 'Completed', icon: getStatusIcon('completed') },
        { key: 'cancelled', label: 'Cancelled', icon: getStatusIcon('cancelled') },
    ];

    // Set initial tab based on URL param
    useEffect(() => {
        if (initialStatusFromUrl && orderStatuses.some(s => s.key === initialStatusFromUrl)) {
            setActiveStatusTab(initialStatusFromUrl);
        } else {
            setActiveStatusTab('new');
        }
    }, [initialStatusFromUrl]);

    // === Data Fetching (using useCallback) ===
    const fetchOrders = useCallback(async () => {
        console.log(`[Orders.jsx] Fetching orders for status: ${activeStatusTab}, Search: "${searchQuery}"`);
        setIsLoading(true);
        setError(null);
        const [startDate, endDate] = dateRange;

        try {
            const params = { status: activeStatusTab };
            if (searchQuery) params.search = searchQuery;

            if (activeStatusTab === 'completed' && showFilters) {
                if (startDate) params.startDate = startDate.toISOString().split('T')[0];
                if (endDate) params.endDate = endDate.toISOString().split('T')[0];
                params.sortBy = sortBy;
                params.sortOrder = sortOrder;
            } else {
                // For non-completed or non-filtered views, always sort by creation date descending
                params.sortBy = 'createdAt';
                params.sortOrder = 'desc';
            }

            console.log("[Orders.jsx] API Params:", params);
            const response = await axiosInstance.get('/orders', { params });
            setOrders(Array.isArray(response.data) ? response.data : []);
            console.log(`[Orders.jsx] Fetched ${response.data?.length ?? 0} orders.`);
        } catch (err) {
            console.error("[Orders.jsx] Error fetching orders:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || "Failed to load orders.");
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeStatusTab, searchQuery, dateRange, sortBy, sortOrder, showFilters]); // Dependencies for API fetching

    // Effect for fetching orders whenever relevant state changes
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]); // Run socket setup only once on mount

    // === Handlers ===
    const handleStatusTabClick = (statusKey) => {
        setActiveStatusTab(statusKey);
        setSearchQuery('');
        setDateRange([null, null]);
        setShowFilters(false);
    };

    const handleSearchChange = (e) => setSearchQuery(e.target.value);
    const handleDateChange = (update) => setDateRange(update);

    // --- ADDED handleSortChange ---
    const handleSortChange = (e) => {
        const [newSort, newOrder] = e.target.value.split('-');
        setSortBy(newSort);
        setSortOrder(newOrder);
    };
    // --- END handleSortChange ---

    const handleAcknowledgeAlert = () => {
        setNewOrderAlert(null);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    };

    const openDetailModal = (order) => { setSelectedOrder(order); setIsDetailModalOpen(true); };
    const closeDetailModal = () => { setIsDetailModalOpen(false); setSelectedOrder(null); };

    // --- ADDED handleUpdateStatus ---
    const handleUpdateStatus = async (orderId, newStatus) => {
        const order = orders.find(o => o._id === orderId) || (selectedOrder?._id === orderId ? selectedOrder : null);
        if (!order) { console.error(`Cannot update status: Order ${orderId} not found.`); return; }

        const allowedStatuses = getAllowedNextStatuses(order.status);
        if (!allowedStatuses.includes(newStatus)) {
            alert(`Cannot change status from ${order.status} to ${newStatus}.`);
            return;
        }

        setStatusUpdateLoading(orderId);
        setError(null);

        try {
            const response = await axiosInstance.patch(`/orders/${orderId}/status`, { status: newStatus });
            const updatedOrder = response.data;

            setOrders(prev => {
                if (updatedOrder.status === activeStatusTab) {
                    return prev.map(o => o._id === orderId ? updatedOrder : o);
                } else {
                    return prev.filter(o => o._id !== orderId); // Remove if status no longer matches tab
                }
            });

            await fetchOrders();
            if (selectedOrder?._id === orderId) { setSelectedOrder(updatedOrder); }

        } catch (err) {
            console.error("Error updating order status:", err.response?.data || err.message);
            setError(err.response?.data?.message || `Failed to update order #${order.orderNumber}.`);
        } finally {
            setStatusUpdateLoading(null);
        }
    };
    // --- END handleUpdateStatus ---


    // === Animation Variants ===
    const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } };
    const modalBackdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
    const modalPanelVariants = { hidden: { scale: 0.9, opacity: 0, y: 30 }, visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }, exit: { scale: 0.9, opacity: 0, y: 30, transition: { duration: 0.2 } } };
    const filterVariants = { hidden: { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }, visible: { height: 'auto', opacity: 1, marginTop: '1rem', marginBottom: '1rem', transition: { duration: 0.3 } }, exit: { height: 0, opacity: 0, marginTop: 0, marginBottom: 0, transition: { duration: 0.3 } } };
    const notificationVariants = { hidden: { opacity: 0, y: 50, scale: 0.8 }, visible: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 50, scale: 0.8, transition: { duration: 0.2 } } };
    // === RENDER ===
    return (
        <> {/* Use Fragment to wrap multiple top-level elements */}

            {/* Hidden Audio Element for Notification Sound */}
            <audio ref={audioRef} src="/notification.mp3" preload="auto" />

            {/* Persistent New Order Alert Notification */}
            <AnimatePresence>
                {newOrderAlert && alertOrderData && ( // Show only when state has order data
                    <motion.div
                        // Animation properties
                        variants={notificationVariants} // Use predefined variants
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                        // Styling and Positioning
                        className="fixed bottom-5 right-5 z-[100] w-full max-w-xs sm:max-w-sm bg-white rounded-lg shadow-2xl p-4 border border-indigo-200"
                        role="alert" aria-live="assertive"
                    >
                        {/* Alert Content */}
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <FiBell className="h-6 w-6 text-indigo-500 animate-pulse" /> {/* Pulsing Bell */}
                            </div>
                            <div className="ml-3 w-0 flex-1">
                                {/* Alert Title */}
                                <p className="text-sm font-bold text-gray-900">
                                    New Order Received! (#{alertOrderData.orderNumber}) {/* Display Order Number */}
                                </p>
                                {/* Alert Details */}
                                <p className="mt-1 text-sm text-gray-600 truncate">
                                    {/* Show Type/Table/Customer Name */}
                                    {getOrderTypeDetails(alertOrderData.orderType).label}
                                    {alertOrderData.orderType === 'dine-in' && ` (Table ${alertOrderData.tableNumber})`}
                                    {alertOrderData.orderType !== 'dine-in' && ` (${alertOrderData.customerInfo?.name || 'N/A'})`}
                                </p>
                                {/* Alert Actions */}
                                <div className="mt-2 flex space-x-2">
                                    <button
                                        onClick={handleAcknowledgeAlert} // Just dismiss
                                        className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        Dismiss
                                    </button>
                                    <Link
                                        to={`/orders?status=new&highlight=${alertOrderData._id}`} // Link to orders? Pass highlight param?
                                        onClick={() => { // Go to tab AND dismiss
                                            if (activeStatusTab !== 'new') { handleStatusTabClick('new'); }
                                            handleAcknowledgeAlert();
                                        }}
                                        className="inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        View
                                    </Link>
                                </div>
                            </div>
                            {/* Close Button */}
                            <div className="ml-4 flex-shrink-0 flex">
                                <button onClick={handleAcknowledgeAlert} className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-1">
                                    <span className="sr-only">Close</span>
                                    <FiX className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Page Layout */}
            <div className="min-h-screen bg-gray-100 font-sans">
                {/* Header */}
                <header className="bg-white shadow-sm sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <Link to="/dashboard" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800">
                                <span className="font-bold text-lg hidden sm:inline">ScanPlate</span>
                            </Link>
                            <div className="flex items-center">
                                <div className="ml-3 relative">
                                    <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">U</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Page Header */}
                    <div className="mb-6 md:flex md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate"> Restaurant Orders </h2>
                            <p className="mt-1 text-sm text-gray-500"> View and manage incoming and past orders. </p>
                        </div>
                    </div>

                    {/* Page Level Error Display (for non-loading errors like failed status update) */}
                    {error && !isLoading && (
                        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center justify-between space-x-2" role="alert">
                            <div className="flex items-center space-x-2">
                                <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                                <span className="font-medium">{error}</span> {/* Display the error message */}
                            </div>
                            {/* Button to clear the error */}
                            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 focus:outline-none p-1 -m-1 rounded-full hover:bg-red-200">
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Status Tabs */}
                    <div className="mb-6 bg-white rounded-lg shadow-sm">
                        <div className="border-b border-gray-200 px-2 sm:px-4 overflow-x-auto">
                            <nav className="-mb-px flex space-x-4 sm:space-x-6 whitespace-nowrap" aria-label="Order Status Tabs">
                                {orderStatuses.map((status) => {
                                    const Icon = status.icon; // Assign component here
                                    const statusStyles = getStatusStyles(status.key);
                                    const isActive = activeStatusTab === status.key;
                                    return (
                                        <button
                                            key={status.key}
                                            onClick={() => handleStatusTabClick(status.key)}
                                            className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-150 ease-in-out ${isActive ? `${statusStyles.border} ${statusStyles.text}` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {/* Render the Icon component */}
                                            <Icon className={`mr-2 h-5 w-5 ${isActive ? statusStyles.icon : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                                            {status.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Search and Filter Area */}
                    <div className="mb-5 p-4 bg-white rounded-lg shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Search Input */}
                            <div className="flex-grow sm:max-w-sm">
                                <label htmlFor="search-orders" className="sr-only">Search Orders</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiSearch className="h-5 w-5 text-gray-400" /></div>
                                    <input type="search" id="search-orders" placeholder="Search Order #, Name, Phone..." value={searchQuery} onChange={handleSearchChange} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                            </div>
                            {/* Filter Button */}
                            {activeStatusTab === 'completed' && (
                                <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                                    <FiFilter className="h-5 w-5 mr-2 text-gray-400" /> Filters
                                    <FiChevronDown className={`ml-2 h-5 w-5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                        </div>
                        {/* Collapsible Filters */}
                        <AnimatePresence>
                            {showFilters && activeStatusTab === 'completed' && (
                                <motion.div variants={filterVariants} initial="hidden" animate="visible" exit="exit" className="border-t border-gray-200 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                        {/* Date Range Picker */}
                                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label> <DatePicker selectsRange={true} startDate={dateRange[0]} endDate={dateRange[1]} onChange={handleDateChange} isClearable={true} placeholderText="Select date range" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" dateFormat="yyyy-MM-dd" /> </div>
                                        {/* Sort By Dropdown */}
                                        <div> <label htmlFor="sort-completed" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label> <select id="sort-completed" value={`${sortBy}-${sortOrder}`} onChange={handleSortChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"> <option value="createdAt-desc">Date (Newest)</option> <option value="createdAt-asc">Date (Oldest)</option> <option value="totalAmount-desc">Amount (High-Low)</option> <option value="totalAmount-asc">Amount (Low-High)</option> </select> </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Orders List / Loading / Error / Empty States */}
                    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                        {isLoading ? (<div className="py-16 text-center"><LoadingSpinner message={`Loading ${activeStatusTab} orders`} /></div>)
                            : error && orders.length === 0 ? (<div className="text-center py-16 px-6"><ErrorMessage message={error} onRetry={fetchOrders} /></div>)
                                : orders.length === 0 ? (
                                    <div className="text-center py-16 px-6 text-gray-500">
                                        <FiInbox className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Orders Found</h3>
                                        <p className="mt-1 text-sm"> {searchQuery ? `No orders match search.` : `There are currently no '${activeStatusTab}' orders.`} </p>
                                        {searchQuery && (<button onClick={() => setSearchQuery('')} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">Clear search</button>)}
                                    </div>
                                ) : (
                                    // --- Table View START ---
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Time</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                <AnimatePresence initial={false}>
                                                    {orders.map((order) => {
                                                        const StatusIcon = getStatusIcon(order.status);
                                                        const statusStyles = getStatusStyles(order.status);
                                                        const typeInfo = getOrderTypeDetails(order.orderType);
                                                        const TypeIcon = typeInfo.icon;
                                                        const typeStyles = getOrderTypeStyles(order.orderType);
                                                        const nextStatuses = getAllowedNextStatuses(order.status);
                                                        const isHighlighted = order._id === highlightedOrderId;

                                                        return (
                                                            <motion.tr key={order._id} layout variants={itemVariants} initial="hidden" animate="show" exit="exit" onClick={() => openDetailModal(order)} className={`${isHighlighted ? 'bg-indigo-50' : ''} hover:bg-gray-50 transition-colors duration-150 cursor-pointer`}>
                                                                <td className="px-4 py-4 whitespace-nowrap"> <div className={`text-sm font-semibold flex items-center ${isHighlighted ? 'text-indigo-700' : 'text-gray-900'}`}> <FiHash className="w-3.5 h-3.5 mr-1 text-gray-400" /> {order.orderNumber || 'N/A'} </div> </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2 mb-0.5">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${typeStyles.bg} ${typeStyles.text}`}> <TypeIcon className="mr-1 h-3 w-3" /> {typeInfo.label} </span>
                                                                        {order.orderType === 'dine-in' && order.tableNumber && (<span className="text-xs text-gray-500">(Table {order.tableNumber})</span>)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-800 font-medium truncate max-w-[150px]"> {order.customerInfo?.name || (order.orderType !== 'dine-in' ? <span className="italic text-gray-400">No Name</span> : '')} </div>
                                                                    {order.customerInfo?.phone && (<div className="text-xs text-gray-500 flex items-center mt-0.5"> <FiPhone className="w-3 h-3 mr-1 text-gray-400" />{order.customerInfo.phone} </div>)}
                                                                </td>
                                                                {/* Time */}
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell"> {new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} </td>
                                                                {/* Amount */}
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900"> ${order.totalAmount?.toFixed(2) ?? '0.00'} </td>
                                                                {/* Status */}
                                                                <td className="px-4 py-4 whitespace-nowrap"> <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles.bg} ${statusStyles.text}`}> <StatusIcon className="mr-1.5 h-3 w-3" /> {order.status} </span> </td>
                                                                {/* Actions */}
                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1 sm:space-x-2">
                                                                    <button onClick={() => openDetailModal(order)} title="View Details" className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"> <FiEye className="w-4 h-4 sm:w-5 sm:h-5" /> </button>
                                                                    {/* Status Update Dropdown */}
                                                                    {nextStatuses.length > 0 && (
                                                                        <div className="relative inline-block text-left py-2" onClick={(e) => e.stopPropagation()}>
                                                                            <select value="" onChange={(e) => handleUpdateStatus(order._id, e.target.value)} disabled={statusUpdateLoading === order._id} className={`text-xs rounded border-gray-300 shadow-sm  py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${statusUpdateLoading === order._id ? 'opacity-50 cursor-wait' : 'hover:border-gray-400'}`} style={{ paddingRight: '1.75rem', paddingLeft: '0.5rem', paddingTop: '0.35rem', paddingBottom: '0.35rem' }} aria-label={`Update status for order ${order.orderNumber}`}>
                                                                                <option value="" disabled>Update...</option>
                                                                                {nextStatuses.map(nextStatusKey => {
                                                                                    const statusDetail = orderStatuses.find(s => s.key === nextStatusKey);
                                                                                    if (!statusDetail) return null;
                                                                                    let actionLabel = `Mark as ${statusDetail.label}`;
                                                                                    if (nextStatusKey === 'completed') actionLabel = 'Complete Order';
                                                                                    if (nextStatusKey === 'cancelled') actionLabel = 'Cancel Order';
                                                                                    return (<option key={nextStatusKey} value={nextStatusKey}>{actionLabel}</option>);
                                                                                })}
                                                                            </select>
                                                                            {statusUpdateLoading === order._id && <FiLoader className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-indigo-600" />}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </tbody>
                                        </table>
                                    </div>
                                    // --- Table View END ---
                                )}
                    </div>

                </main>

                {/* Order Detail Modal */}
                <AnimatePresence>
                    {isDetailModalOpen && selectedOrder && (
                        <motion.div variants={modalBackdropVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeDetailModal}>
                            <motion.div variants={modalPanelVariants} className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full mx-auto flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                                {/* Modal Header */}
                                <div className="bg-gray-50 px-4 py-4 sm:px-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                                    <h3 id="modal-title" className="text-lg leading-6 font-semibold text-gray-900"> Order Details (#{selectedOrder.orderNumber || 'N/A'}) </h3>
                                    <button onClick={closeDetailModal} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"><span className="sr-only">Close</span><FiX className="h-6 w-6" /></button>
                                </div>
                                {/* Modal Content (Scrollable) */}
                                <div className="p-4 sm:p-6 overflow-y-auto">
                                    {/* Order Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                                        {/* (Customer/Table, Status, Amount sections - Ensure they use selectedOrder correctly) */}
                                        <div className="bg-gray-50 p-3 rounded-md border"> <h4 className="font-medium text-gray-700 mb-1">
                                            {React.createElement(getOrderTypeDetails(selectedOrder.orderType).icon, { className: "w-4 h-4 mr-1.5" })} Details</h4>
                                            {/* --- ADD THIS SECTION --- */}
                                            <div className="flex items-center text-gray-700">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getOrderTypeStyles(selectedOrder.orderType).bg} ${getOrderTypeStyles(selectedOrder.orderType).text}`}>
                                                    {getOrderTypeDetails(selectedOrder.orderType).label}
                                                </span>
                                                {selectedOrder.orderType === 'dine-in' && selectedOrder.tableNumber != null && (
                                                    <span className="ml-2 flex items-center text-gray-600">
                                                        <FiMapPin className="w-3.5 h-3.5 mr-1 text-gray-400" /> Table {selectedOrder.tableNumber}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedOrder.customerInfo?.name && (
                                                <div className="flex items-center text-gray-700">
                                                    <FiUser className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{selectedOrder.customerInfo.name}</span>
                                                </div>
                                            )}
                                            {selectedOrder.customerInfo?.phone && (
                                                <div className="flex items-center text-gray-700">
                                                    <FiPhone className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                                    <span>{selectedOrder.customerInfo.phone}</span>
                                                </div>
                                            )}
                                            {selectedOrder.customerInfo?.email && (
                                                <div className="flex items-center text-gray-700">
                                                    <FiMail className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{selectedOrder.customerInfo.email}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-md border"> <h4 className="font-medium text-gray-700 mb-1">
                                            <FiRotateCw className="w-4 h-4 mr-1.5" /> Status & Time</h4>
                                            <div className="flex items-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyles(selectedOrder.status).bg} ${getStatusStyles(selectedOrder.status).text}`}>
                                                    {React.createElement(getStatusIcon(selectedOrder.status), { className: "mr-1 h-3 w-3" })}
                                                    {selectedOrder.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-gray-700">
                                                <FiClock className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                                <span>
                                                    {/* Ensure createdAt exists before formatting */}
                                                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : 'N/A'}
                                                    {' '}
                                                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-md border"> <h4 className="font-semibold text-green-800 mb-1 flex items-center">
                                            <FiDollarSign className="w-4 h-4 mr-1.5" /> Total
                                        </h4>
                                            <div className="text-xl font-bold text-gray-900">
                                                ${selectedOrder.totalAmount?.toFixed(2) ?? '0.00'}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Items List */}
                                    {/* --- Items List --- */}
                                    <h4 className="text-md font-semibold text-gray-800 mb-2 pt-4 border-t border-gray-200">
                                        Items Ordered ({selectedOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}) {/* Correctly sums quantities */}
                                    </h4>
                                    <ul className="divide-y divide-gray-100 text-sm border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                                        {selectedOrder.items?.length > 0 ? (
                                            selectedOrder.items.map((item, index) => (
                                                <li key={item.menuItem?._id || `item-${index}`} className="px-3 py-2.5 bg-white"> {/* Added more robust key */}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 mr-2">
                                                            <span className="font-medium text-indigo-700">{item.quantity} x </span>
                                                            <span className="text-gray-800 font-semibold">{item.name || 'Unknown Item'}</span>
                                                            {/* Display price per unit of this specific customized item */}
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                (@ ${(item.priceAtOrder / item.quantity).toFixed(2)} ea.) {/* Or just item.priceAtOrder if it's already per unit */}
                                                            </span>
                                                        </div>
                                                        <div className="text-gray-700 font-semibold w-20 text-right">
                                                            ${(item.priceAtOrder * item.quantity).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    {/* --- ADDED: Display Customizations --- */}
                                                    {(item.selectedComponents?.length > 0 || item.selectedExtras?.length > 0) && (
                                                        <div className="ml-5 mt-1.5 pl-2 border-l border-gray-200 text-xs space-y-0.5">
                                                            {/* Show default components that were KEPT */}
                                                            {item.selectedComponents?.map(comp => (
                                                                <p key={`comp-${item.menuItem?._id}-${comp}`} className="text-gray-600 flex items-center">
                                                                    <FiTag className="inline mr-1.5 h-3 w-3 text-gray-400" /> {comp}
                                                                </p>
                                                            ))}
                                                            {/* Show added extras */}
                                                            {item.selectedExtras?.map(extra => (
                                                                <p key={`extra-${item.menuItem?._id}-${extra.name}`} className="text-green-600 font-medium flex items-center">
                                                                    <FiPlus className="inline mr-1.5 h-3 w-3 text-green-500" />
                                                                    {extra.name} (${extra.price.toFixed(2)})
                                                                </p>
                                                            ))}
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                (@ ${(item.priceAtOrder / item.quantity).toFixed(2)} ea.) {/* Or just item.priceAtOrder if it's already per unit */}
                                                            </span>

                                                        </div>
                                                    )}
                                                    {/* --- END: Display Customizations --- */}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="p-3 text-gray-500 italic bg-white">No items found in this order.</li>
                                        )}
                                    </ul>

                                    {selectedOrder.notes && ( // Only render if notes exist
                                        <div className="mt-4">
                                            <h4 className="text-md font-semibold text-gray-800 mb-1 flex items-center"> {/* Added flex items-center */}
                                                <FiEdit3 className="w-4 h-4 mr-1.5 text-gray-400" /> {/* Added icon styling */}
                                                Customer Notes
                                            </h4>
                                            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-md border border-yellow-200 whitespace-pre-wrap"> {/* Added bg/padding/border */}
                                                {selectedOrder.notes}
                                            </p>
                                        </div>
                                    )}
                                    {/* --- End Notes Section --- */}
                                </div>
                                {/* Modal Footer */}
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200 flex justify-end flex-shrink-0">
                                    <button type="button" onClick={closeDetailModal} className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> Close </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div> {/* End Main Page Layout div */}
        </> // End Fragment
    );
};

export default Orders;
