import React, { useState, useEffect } from 'react'; // Added useEffect
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IoQrCodeOutline } from "react-icons/io5";
import {
    FiHome, FiSettings, FiMapPin, FiMenu, FiShoppingBag, FiCheckCircle,
    FiBarChart2, FiBriefcase, FiPlusCircle, FiMoreVertical, FiDollarSign, FiClock,
    FiLoader, FiAlertCircle // Added Loader and Alert icons
} from 'react-icons/fi';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import axiosInstance from '../api/axiosInstance';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];


const renderCustomLegend = (props) => {
    const { payload } = props; // Original payload array from recharts legend prop

    // 1. Calculate the total COUNT from all categories provided in the payload.
    const totalCount = payload.reduce((sum, entry) => {
        return sum + (entry.payload?.value || 0);
    }, 0);

    return (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-xs text-gray-600">
            {payload.map((entry, index) => {
                // entry.value is the category NAME (e.g., "Desserts") - used for display label
                // entry.payload.value is the raw COUNT for this category (e.g., 16)

                // 2. Get the count for the current category safely.
                const count = entry.payload?.value || 0;

                // 3. Calculate the actual percentage for this category relative to the total count.
                // Handle division by zero if totalCount is 0.
                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

                return (
                    <li key={`item-${index}`} className="flex items-center">
                        {/* Color Square */}
                        <span
                            className="w-3 h-3 mr-1.5 rounded-full"
                            style={{ backgroundColor: entry.color }} // Use color provided by Recharts
                        ></span>
                        {/* 4. Display the category NAME and the CORRECT calculated percentage */}
                        {entry.value} ({percentage.toFixed(0)}%) {/* Format to whole number percentage */}
                    </li>
                );
            })}
        </ul>
    );
};
// --- End Custom Legend Component ---// --- End Custom Legend Component ---

const MainDashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // State for fetched data
    const [recentOrders, setRecentOrders] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null); // Initialize as null
    const [salesData, setSalesData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);

    // Loading and Error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // These are the calls likely failing:
                const [statsRes, ordersRes, salesRes, categoryRes] = await Promise.all([
                    axiosInstance.get('/dashboard/stats'),
                    axiosInstance.get('/orders?status=new&limit=5&sortBy=createdAt&sortOrder=desc'),
                    axiosInstance.get('/analytics/sales-over-time?period=week'),
                    axiosInstance.get('/analytics/order-categories?period=week')
                ]);

                setDashboardStats(statsRes.data);
                setRecentOrders(ordersRes.data || []);

                // Prepare data for charts (ensure format matches recharts requirements)
                // Example: Ensure sales data has 'name' and 'revenue' keys
                setSalesData(salesRes.data?.map(d => ({ name: d.name, revenue: d.value })) || []);
                console.log(salesRes.data)

                // Example: Ensure category data has 'name' and 'value' (or 'percent') keys
                // If API returns counts, calculate percentages here or adjust legend component

                setCategoryData(categoryRes.data?.map(d => ({ name: d.name, value: d.value /*, percent: d.percent */ })) || []);
                console.log(categoryRes.data)

            } catch (err) { // <<< THE ERROR IS BEING CAUGHT HERE
                console.error("Error fetching dashboard data:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Failed to load dashboard data. Please try again."); // <<< THIS MESSAGE IS SHOWN
                // ... (resetting state) ...
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);


    const menuCards = [
        { id: 'site-info', title: 'Site Info', description: 'Restaurant profiles', icon: <FiBriefcase />, color: 'bg-indigo-500', link: '/site-info' },
        { id: 'menu', title: 'Menu', description: 'Edit your menu', icon: <FiMenu />, color: 'bg-emerald-500', link: '/menu' },
        { id: 'qr-settings', title: 'QR Codes', description: 'Generate & customize', icon: <IoQrCodeOutline />, color: 'bg-purple-500', link: '/qr-settings' },
        { id: 'active-orders', title: 'Orders', description: 'Manage orders', icon: <FiShoppingBag />, color: 'bg-amber-500', link: '/orders' },
        { id: 'settings', title: 'Settings', description: 'App preferences', icon: <FiSettings />, color: 'bg-gray-500', link: '/settings' }
    ];

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

    // Helper to format currency
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0.00';
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };


    // --- Conditional Rendering for Loading/Error ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <FiLoader className="animate-spin h-10 w-10 text-indigo-600" />
                <span className="ml-3 text-lg text-gray-700">Loading Dashboard...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                {/* Basic Header could still be shown */}
                <FiAlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg text-red-700 text-center mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()} // Simple refresh action
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                > Retry </button>
            </div>
        );
    }
    // --- End Conditional Rendering ---


    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center py-3 px-4 sm:px-6 lg:px-8">
                        <Link to="/Main" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800">
                            <FiHome className="h-6 w-6" />
                            <Link to="/#" className="flex items-center text-indigo-600 hover:text-indigo-800"><span className="font-bold text-lg sm:inline">ScanPlate</span ></Link>
                        </Link>
                        <div className="hidden md:flex items-center space-x-3">
                            <Link to="/menu"> <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"> <FiPlusCircle className="mr-1 h-4 w-4" /> New Item </motion.button> </Link>
                            <Link to="/qr-settings"> <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"> <IoQrCodeOutline className="mr-1 h-4 w-4" /> Generate QR </motion.button> </Link>
                        </div>
                        <div className="flex items-center">
                            <button className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none mr-2 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}> <FiMoreVertical className="h-5 w-5" /> </button>
                            <Link to="/site-info" className="flex items-center cursor-pointer group"> <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-medium group-hover:bg-indigo-200 transition-colors"> RM </span> <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:block group-hover:text-indigo-600 transition-colors"> Restaurant </span> </Link>
                        </div>
                    </div>
                    {isMobileMenuOpen && (<div className="px-4 py-3 border-t border-gray-200 bg-gray-50 sm:hidden"> <div className="grid grid-cols-2 gap-2"> <Link to="/menu"> <motion.button whileTap={{ scale: 0.95 }} className="w-full flex items-center justify-center px-2 py-2 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"> <FiPlusCircle className="mr-1 h-3 w-3" /> New Item </motion.button> </Link> <Link to="/qr-settings"> <motion.button whileTap={{ scale: 0.95 }} className="w-full flex items-center justify-center px-2 py-2 text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"> <IoQrCodeOutline className="mr-1 h-3 w-3" /> Gen QR </motion.button> </Link> </div> </div>)}
                </div>
            </header>

            {/* Main Content - Render only if not loading and no error */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Welcome Section */}
                <div className="mb-6"> <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2> <p className="text-sm text-gray-600"> Overview of your restaurant performance </p> </div>

                {/* Quick Stats - Use fetched data */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white overflow-hidden shadow rounded-lg"> <div className="px-4 py-4"> <div className="flex items-center"> <div className="flex-shrink-0 bg-amber-500 rounded-md p-2"> <FiShoppingBag className="h-4 w-4 text-white" /> </div> <div className="ml-3"> <dl> <dt className="text-xs font-medium text-gray-500 truncate"> Active Orders </dt> <dd className="text-xl font-semibold text-gray-900"> {dashboardStats?.activeOrders ?? 0} </dd> </dl> </div> </div> </div> </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white overflow-hidden shadow rounded-lg"> <div className="px-4 py-4"> <div className="flex items-center"> <div className="flex-shrink-0 bg-green-500 rounded-md p-2"> <FiCheckCircle className="h-4 w-4 text-white" /> </div> <div className="ml-3"> <dl> <dt className="text-xs font-medium text-gray-500 truncate"> Completed Today </dt> <dd className="text-xl font-semibold text-gray-900"> {dashboardStats?.completedToday ?? 0} </dd> </dl> </div> </div> </div> </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white overflow-hidden shadow rounded-lg"> <div className="px-4 py-4"> <div className="flex items-center"> <div className="flex-shrink-0 bg-purple-500 rounded-md p-2"> <IoQrCodeOutline className="h-4 w-4 text-white" /> </div> <div className="ml-3"> <dl> <dt className="text-xs font-medium text-gray-500 truncate"> QR Scans Today </dt> <dd className="text-xl font-semibold text-gray-900"> {dashboardStats?.qrScansToday ?? 0} </dd> </dl> </div> </div> </div> </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white overflow-hidden shadow rounded-lg"> <div className="px-4 py-4"> <div className="flex items-center"> <div className="flex-shrink-0 bg-blue-500 rounded-md p-2"> <FiDollarSign className="h-4 w-4 text-white" /> </div> <div className="ml-3"> <dl> <dt className="text-xs font-medium text-gray-500 truncate"> Today's Revenue </dt> <dd className="text-xl font-semibold text-gray-900"> {formatCurrency(dashboardStats?.todaysRevenue)} </dd> </dl> </div> </div> </div> </motion.div>
                </div>

                {/* Analytics Dashboard Section */}
                <div className="mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sales Chart */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white shadow rounded-lg lg:col-span-2">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Sales</h3>
                                {salesData.length > 0 ? (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {/* Use 'revenue' key */}
                                            <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="#eef2ff" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-500">No sales data available.</div>
                                )}
                            </div>
                        </motion.div>
                        {/* Category Distribution */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Categories</h3>
                                {categoryData.length > 0 ? (
                                    <div className="h-64 flex flex-col items-center">
                                        <ResponsiveContainer width="100%" height="80%">
                                            <PieChart>
                                                {/* Use 'value' key */}
                                                <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                                                    {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                </Pie>
                                                {/* Adjust tooltip based on 'value' (count or percent) */}
                                                <Tooltip formatter={(value, name, props) => [`${value} orders`, name]} />
                                                {/* <Tooltip formatter={(value, name, props) => [`${(props.payload.percent * 100).toFixed(0)}%`, name]} /> */}
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="w-full mt-auto pt-2">
                                            {/* Pass mapped data to legend */}
                                            {renderCustomLegend({ payload: categoryData.map((entry, index) => ({ value: entry.name, type: 'square', color: COLORS[index % COLORS.length], payload: entry })) })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-500">No category data available.</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Main Menu Grid */}
                <h3 className="text-lg font-semibold text-gray-900 mt-4">Management</h3>
                <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4" variants={containerVariants} initial="hidden" animate="show">
                    {menuCards.map((card) => (
                        <motion.div key={card.id} variants={itemVariants}>
                            <Link to={card.link} className="block h-full">
                                <div className="h-full bg-white overflow-hidden shadow-sm rounded-lg hover:shadow transition-shadow duration-300 group">
                                    <div className={`h-1 ${card.color}`}></div>
                                    <div className="p-4 text-center flex flex-col items-center justify-center">
                                        <div className={`mb-3 p-3 rounded-full ${card.color} text-white transition-colors duration-300`}>
                                            {React.cloneElement(card.icon, { className: "w-6 h-6" })}
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900">{card.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Recent New Orders Table */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white shadow rounded-lg mt-8 mb-4">
                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center"> <h3 className="text-lg font-medium text-gray-900">New Orders</h3> <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-500"> View all orders </Link> </div>
                    <div className="overflow-x-auto">
                        {recentOrders.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-500">No new orders found.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200"> <thead className="bg-gray-50"> <tr> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Details</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th> <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th> </tr> </thead> <tbody className="bg-white divide-y divide-gray-200"> {recentOrders.map((order) => (<tr key={order._id}> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.orderNumber}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"> {order.orderType === 'table' ? `Table ${order.tableNumber}` : `${order.customerInfo?.name || order.orderType}`} </td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} items</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(order.totalAmount)}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </td> </tr>))} </tbody> </table>
                        )}
                    </div>
                </motion.div>


            </main>
        </div>
    );
};

export default MainDashboard;
