
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiDollarSign, FiShoppingBag, FiUsers, FiTrendingUp, FiCalendar, FiLoader, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import axiosInstance from '../api/axiosInstance'; // Assuming path is correct

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']; // For Pie chart

const Analytics = () => {
    const [summaryData, setSummaryData] = useState(null);
    const [salesData, setSalesData] = useState([]);
    const [orderTypeData, setOrderTypeData] = useState([]);
    const [timePeriod, setTimePeriod] = useState('week'); // 'day', 'week', 'month'
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch data for the selected time period
                // const summaryRes = await axiosInstance.get(`/api/analytics/summary?period=${timePeriod}`);
                // const salesRes = await axiosInstance.get(`/api/analytics/sales-over-time?period=${timePeriod}`);
                // const orderTypeRes = await axiosInstance.get(`/api/analytics/order-types?period=${timePeriod}`);

                // --- MOCK DATA ---
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
                const mockSummary = {
                    totalRevenue: 7580.50,
                    totalOrders: 315,
                    averageOrderValue: (7580.50 / 315),
                    newCustomers: 45, // Example metric
                };
                const mockSales = [
                    // Data structure depends on the period (days for week, weeks for month, etc.)
                    { name: 'Mon', sales: 1100 }, { name: 'Tue', sales: 950 }, { name: 'Wed', sales: 1400 },
                    { name: 'Thu', sales: 1050 }, { name: 'Fri', sales: 1680 }, { name: 'Sat', sales: 1950 },
                    { name: 'Sun', sales: 1450.50 }
                ].map(d => ({ ...d, revenue: d.sales })); // Adjust key if backend returns 'revenue'

                const mockOrderTypes = [
                    { name: 'Table', value: 150 }, // Use 'value' for Pie chart
                    { name: 'Pickup', value: 105 },
                    { name: 'Delivery', value: 60 },
                ];
                // --- END MOCK DATA ---

                setSummaryData(mockSummary);
                setSalesData(mockSales);
                setOrderTypeData(mockOrderTypes);

            } catch (err) {
                console.error("Error fetching analytics data:", err);
                setError("Failed to load analytics data. Please try refreshing.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalyticsData();
    }, [timePeriod]); // Re-fetch when timePeriod changes

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0.00';
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderLoading = () => (
        <div className="flex justify-center items-center py-10">
            <FiLoader className="animate-spin h-8 w-8 text-indigo-600" />
            <span className="ml-3 text-gray-500">Loading data...</span>
        </div>
    );

    const renderError = () => (
        <div className="text-center py-10 px-6 bg-red-50 rounded-lg border border-red-200">
            <FiAlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h3 className="mt-2 text-lg font-medium text-red-800">Error Loading Data</h3>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">Try Again</button>
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link to="/Main" className="text-gray-500 hover:text-gray-700 mr-3 p-1 rounded-full hover:bg-gray-100">
                                <FiArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-xl font-semibold text-gray-900">Analytics Overview</h1>
                        </div>
                        {/* Time Period Selector */}
                        <div>
                            <select
                                value={timePeriod}
                                onChange={(e) => setTimePeriod(e.target.value)}
                                className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                disabled={isLoading}
                            >
                                <option value="day">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                {/* Add custom range option later? */}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error ? renderError() : (
                    <div className="space-y-8">
                        {/* Summary Metrics */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Summary ({timePeriod})</h2>
                            {isLoading ? renderLoading() : !summaryData ? <p>No summary data available.</p> : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {/* Total Revenue */}
                                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center space-x-4">
                                        <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                                            <FiDollarSign className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(summaryData.totalRevenue)}</dd>
                                        </div>
                                    </div>
                                    {/* Total Orders */}
                                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center space-x-4">
                                        <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                                            <FiShoppingBag className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-gray-900">{summaryData.totalOrders?.toLocaleString() ?? '0'}</dd>
                                        </div>
                                    </div>
                                    {/* Avg Order Value */}
                                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center space-x-4">
                                        <div className="flex-shrink-0 bg-purple-100 rounded-full p-3">
                                            <FiTrendingUp className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Avg. Order Value</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(summaryData.averageOrderValue)}</dd>
                                        </div>
                                    </div>
                                    {/* New Customers (Example) */}
                                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center space-x-4">
                                        <div className="flex-shrink-0 bg-yellow-100 rounded-full p-3">
                                            <FiUsers className="h-6 w-6 text-yellow-600" />
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 truncate">New Customers</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-gray-900">{summaryData.newCustomers?.toLocaleString() ?? 'N/A'}</dd>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Sales Over Time */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white shadow rounded-lg lg:col-span-2 p-6"
                            >
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Over Time</h3>
                                {isLoading ? renderLoading() : salesData.length === 0 ? <p>No sales data available for this period.</p> : (
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="#c7d2fe" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </motion.div>

                            {/* Order Type Distribution */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white shadow rounded-lg p-6"
                            >
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Types</h3>
                                {isLoading ? renderLoading() : orderTypeData.length === 0 ? <p>No order type data available.</p> : (
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={orderTypeData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {orderTypeData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Add more charts/tables here */}
                        {/* e.g., Top Selling Items (Table or Bar Chart) */}
                        {/* e.g., Customer Insights */}

                    </div>
                )}
            </main>
        </div>
    );
};

export default Analytics;
