import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import {
    FiHome, FiDownload, FiPrinter, FiPlus, FiEdit, FiTrash2, FiX,
    FiGrid, FiList, FiFilter, FiSearch, FiArrowDown, FiArrowUp, FiCheckCircle,
    FiLoader, FiAlertCircle, FiTag, FiTable, FiShoppingBag, FiLink, FiCopy // Added icons
} from 'react-icons/fi';
import { IoQrCodeOutline } from "react-icons/io5";
import axiosInstance from '../api/axiosInstance'; // Assume configured correctly
import { Link } from 'react-router-dom'; // Import Link

const QrGenerator = () => {
    // === State ===
    const [qrCodes, setQRCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // For initial page load
    const [error, setError] = useState(null); // For page-level errors (fetch/delete)
    const [isSubmitting, setIsSubmitting] = useState(false); // For modal form submission
    const [submitError, setSubmitError] = useState(''); // For modal form errors

    // UI Control State
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedQR, setSelectedQR] = useState(null); // For editing
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'table', 'pickup-delivery'
    const [sortBy, setSortBy] = useState('newest');
    const [notification, setNotification] = useState(null); // For temporary success messages

    // Form State
    const [formData, setFormData] = useState({
        _id: null,
        name: '',
        type: 'table',
        tableNumber: '',
        color: '#000000',
    });

    // Refs
    const filterDropdownRef = useRef(null); // Add refs if needed for outside click
    const sortDropdownRef = useRef(null);

    // === Fetch Data ===
    const fetchQrCodes = async () => {
        setIsLoading(true); // Start loading indicator for initial fetch
        setError(null);
        try {
            const response = await axiosInstance.get('/qrcodes');
            setQRCodes(response.data || []); // Expecting an array
        } catch (err) {
            console.error("Error fetching QR codes:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || "Failed to load QR codes. Please try refreshing.");
            setQRCodes([]); // Ensure state is an empty array on error
        } finally {
            setIsLoading(false); // Always stop loading indicator after fetch attempt
        }
    };

    useEffect(() => {
        fetchQrCodes();
    }, []); // Fetch only on initial mount

    // === Modal Handling ===
    const openCreateModal = () => {
        setFormData({ _id: null, name: '', type: 'table', tableNumber: '', color: '#000000' });
        setSubmitError('');
        setIsCreateModalOpen(true);
    };

    const openEditModal = (qr) => {
        setSelectedQR(qr);
        setFormData({
            _id: qr._id,
            name: qr.name,
            type: qr.type,
            tableNumber: qr.tableNumber?.toString() || '',
            color: qr.styleOptions?.color || '#000000',
        });
        setSubmitError('');
        setIsEditModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedQR(null);
        // Don't reset formData here, let openCreateModal handle resets
    };

    // === Form Input Handling ===
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'type' && value !== 'table') {
                newState.tableNumber = ''; // Clear tableNumber if not 'table' type
            }
            return newState;
        });
    };

    // === API Actions ===
    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setIsSubmitting(true); // Start submitting indicator

        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                // Only include tableNumber if type is 'table' and value is not empty
                tableNumber: (formData.type === 'table' && formData.tableNumber) ? formData.tableNumber : undefined,
                color: formData.color,
            };
            const response = await axiosInstance.post('/qrcodes', payload);
            setQRCodes(prev => [response.data, ...prev]); // Add to beginning
            closeModal();
            showNotification('QR code created successfully');
        } catch (err) {
            console.error("Error creating QR code:", err.response?.data || err.message, err);
            setSubmitError(err.response?.data?.message || "Failed to create QR code. Please try again.");
        } finally {
            setIsSubmitting(false); // Stop submitting indicator
        }
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        if (!formData._id) return;
        setSubmitError('');
        setIsSubmitting(true); // Start submitting indicator

        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                tableNumber: (formData.type === 'table' && formData.tableNumber) ? formData.tableNumber : undefined,
                color: formData.color,
            };
            const response = await axiosInstance.put(`/qrcodes/${formData._id}`, payload);
            setQRCodes(prev => prev.map(qr => qr._id === formData._id ? response.data : qr));
            closeModal();
            showNotification('QR code updated successfully');
        } catch (err) {
            console.error("Error updating QR code:", err.response?.data || err.message, err);
            setSubmitError(err.response?.data?.message || "Failed to update QR code. Please try again.");
        } finally {
            setIsSubmitting(false); // Stop submitting indicator
        }
    };

    const handleDeleteQR = async (id) => {
        // Find item for potential revert (though usually not needed for simple delete)
        const itemToDelete = qrCodes.find(qr => qr._id === id);
        if (!window.confirm(`Are you sure you want to delete "${itemToDelete?.name || 'this QR code'}"?`)) {
            return;
        }

        // Optimistic UI Update
        setQRCodes(prev => prev.filter(qr => qr._id !== id));
        setError(null); // Clear previous page errors

        try {
            await axiosInstance.delete(`/qrcodes/${id}`);
            showNotification('QR code deleted.'); // Success notification
        } catch (err) {
            console.error("Error deleting QR code:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || "Failed to delete QR code. Please refresh.");
            // Revert UI on error
            if (itemToDelete) {
                setQRCodes(prev => [...prev, itemToDelete]); // Add back (order might be lost)
                // Optionally re-sort here based on current `sortBy`
            }
            // No success notification on error
        }
    };

    // === Helper Functions ===
    const showNotification = (message) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    const copyToClipboard = (text, name) => {
        navigator.clipboard.writeText(text)
            .then(() => showNotification(`URL for "${name}" copied!`))
            .catch(err => {
                console.error('Failed to copy URL: ', err);
                setError('Could not copy URL to clipboard.');
            });
    };

    const renderQRCodeComponent = (qr, size = 128) => {
        if (!qr?.targetUrl) {
            // Placeholder if URL is missing
            return (
                <div className={`flex items-center justify-center bg-gray-200 text-gray-500 text-xs text-center p-2`} style={{ width: size, height: size }}>
                    Missing<br />URL
                </div>
            );
        }
        // Render using QRCodeSVG component
        return (
            <QRCodeSVG
                value={qr.targetUrl}
                size={size}
                bgColor={"#ffffff"}
                fgColor={qr.styleOptions?.color || "#000000"}
                level={"H"}
                includeMargin={true} // Adds a white margin around the QR code
            />
        );
    };
    // ***************************************************

    // ***** ADD THIS FUNCTION for Downloading QR Code *****
    const downloadQrCodeCanvas = (qr, format = 'png') => {
        const filename = `${qr.name?.replace(/[^a-z0-9]/gi, '_') || 'qr-code'}-${qr._id.slice(-6)}.${format}`;
        const canvas = document.createElement('canvas');

        if (!qr?.targetUrl) {
            console.error("Download failed: QR data is missing targetUrl.", qr);
            setError("Cannot download QR code: Target URL is missing.");
            return;
        }

        // Use the imported 'QRCode' object from the core 'qrcode' library
        QRCode.toCanvas(canvas, qr.targetUrl, {
            errorCorrectionLevel: 'H',
            width: 512, // Use a larger size for better download quality
            margin: 4, // Standard QR margin
            color: {
                dark: qr.styleOptions?.color || "#000000", // QR code blocks
                light: "#FFFFFF", // Background (important for PNG)
            },
        }, (error) => {
            if (error) {
                console.error("QR Code Download Generation Error:", error);
                setError("Failed to generate QR code image for download.");
                return;
            }
            try {
                const dataUrl = canvas.toDataURL(`image/${format}`);
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showNotification(`Downloaded ${filename}`);
            } catch (downloadError) {
                console.error("QR Code Download Trigger Error:", downloadError);
                setError("Failed to initiate QR code download.");
            }
        });
    };

    // --- Filtering and Sorting (Client-side) ---
    // useMemo will recalculate only when dependencies change
    const filteredAndSortedQRCodes = useMemo(() => {
        return qrCodes
            .filter(qr =>
                (filterType === 'all' || qr.type === filterType) &&
                (
                    !searchTerm || // Show all if search term is empty
                    qr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (qr.tableNumber && qr.tableNumber.toString().includes(searchTerm)) ||
                    (qr.targetUrl && qr.targetUrl.toLowerCase().includes(searchTerm.toLowerCase())) // Search URL too
                )
            )
            .sort((a, b) => {
                switch (sortBy) {
                    case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    case 'oldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                    case 'most-scanned': return (b.scanCount || 0) - (a.scanCount || 0);
                    case 'name-az': return a.name.localeCompare(b.name);
                    case 'name-za': return b.name.localeCompare(a.name);
                    default: return 0;
                }
            });
    }, [qrCodes, filterType, searchTerm, sortBy]); // Dependencies

    // --- QR Code Image Rendering ---
    const renderQRImageElement = (qr, sizeClass = 'h-32 w-32') => {
        // --- Explicitly construct the full URL ---
        const backendBaseUrl = axiosInstance.defaults.baseURL || ''; // Get base URL (e.g., http://localhost:5000/api)

        // Ensure we don't have double slashes if baseURL already ends with / and path starts with /
        // (This specific path doesn't start with /, but good practice)
        const imagePath = `qrcodes/${qr._id}/image`; // Path relative to base API URL

        // Construct the full, absolute URL to the image endpoint
        const imageUrl = `${backendBaseUrl.replace(/\/$/, '')}/${imagePath}`; // Combine base and path

        // Log the final URL being used in the <img> tag
        console.log(`>>> FRONTEND DEBUG: Rendering QR Image for ID ${qr._id} with URL: ${imageUrl}`);

        return (
            <img
                // Use the fully constructed URL
                src={imageUrl}
                alt={`QR Code for ${qr.name || 'Unnamed'}`} // Add fallback for name
                className={`${sizeClass} border border-gray-200 rounded-md object-contain bg-white`} // bg-white helps with transparency
                loading="lazy" // Add lazy loading for potentially many images
                onError={(e) => {
                    e.target.onerror = null; // Prevent infinite loop if placeholder fails
                    // Log image loading error
                    console.error(`>>> FRONTEND DEBUG: Failed to load image: ${imageUrl}`, e);
                    // Use a more robust SVG placeholder on error
                    e.target.src = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' fill='%23e5e7eb'/%3e%3cpath d='M25 35 L75 35 L75 65 L25 65 Z M25 70 L75 70 L75 75 L25 75 Z' fill='%239ca3af'/%3e%3ctext x='50' y='90' font-family='sans-serif' font-size='8' fill='%236b7280' text-anchor='middle'%3eError%3c/text%3e%3c/svg%3e`;
                }}
            />
        );
    };

    // === Animation Variants ===
    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0 } };
    const modalVariants = { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }, exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } } };
    const fadeVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

    // === Render Logic ===

    // 1. Initial Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <FiLoader className="animate-spin h-10 w-10 text-indigo-600" />
                <span className="ml-3 text-lg text-gray-700">Loading QR Codes...</span>
            </div>
        );
    }

    // 2. Error State (Fetch Error)
    if (error && !isLoading) { // Show error only after loading attempt failed
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <FiAlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg text-red-700 text-center mb-4">{error}</p>
                <button
                    onClick={fetchQrCodes} // Allow retry
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                > Retry </button>
            </div>
        );
    }

    // 3. Main Content Render
    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Use Link component for internal navigation */}
                        <Link to="/Main" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800">
                            <FiHome className="h-6 w-6" />
                            <Link to="/#" className="flex items-center text-indigo-600 hover:text-indigo-800"><span className="font-bold text-lg sm:inline">ScanPlate</span ></Link>
                        </Link>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={openCreateModal}
                                className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <FiPlus className="-ml-1 mr-2 h-5 w-5" /> Create QR
                            </motion.button>
                            <div className="relative">
                                <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">U</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        className="fixed top-20 right-4 bg-green-600 text-white px-4 py-3 rounded-md shadow-lg z-[60] flex items-center" // Ensure high z-index
                        initial="hidden" animate="visible" exit="hidden" variants={fadeVariants} layout
                    >
                        <FiCheckCircle className="mr-2 flex-shrink-0" /> <span>{notification}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Add Button for Mobile */}
            <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={openCreateModal}
                className="sm:hidden fixed bottom-6 right-6 z-40 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none"
                aria-label="Create QR Code"
            >
                <FiPlus className="h-6 w-6" />
            </motion.button>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                        QR Code Management
                    </h1>
                    {/* Optional: Display non-fetch errors here if needed */}
                    {error && !isLoading && (
                        <div className="mt-3 bg-red-50 border border-red-200 text-sm text-red-800 rounded-md p-3 flex items-center space-x-2">
                            <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                            <span>{error}</span> {/* Display non-fetch errors like delete failure */}
                            <button onClick={() => setError(null)} className="ml-auto text-red-800 hover:text-red-900">
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Action Bar: Search, Filter, Sort, View - RESPONSIVE */}
                <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Search (Takes more space initially) */}
                        <div className="relative flex-grow sm:flex-grow-0 sm:w-64 md:w-72">
                            <label htmlFor="search-qr" className="sr-only">Search QR Codes</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiSearch className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="search" id="search-qr" placeholder="Search name, table, URL..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        {/* Filters, Sort, View Toggle (Grouped, wraps on small screens) */}
                        <div className="flex items-center flex-wrap justify-start sm:justify-end gap-3">
                            {/* Filter Dropdown */}
                            <div className="relative">
                                <label htmlFor="filter-type" className="sr-only">Filter by Type</label>
                                <select
                                    id="filter-type" value={filterType} onChange={(e) => setFilterType(e.target.value)}
                                    className="h-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="table">Table QR</option>
                                    <option value="pickup-delivery">Pickup/Delivery</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"> <FiFilter className="h-4 w-4" /> </div>
                            </div>
                            {/* Sort Dropdown */}
                            <div className="relative">
                                <label htmlFor="sort-by" className="sr-only">Sort By</label>
                                <select
                                    id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                                    className="h-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="newest">Sort: Newest</option>
                                    <option value="oldest">Sort: Oldest</option>
                                    <option value="most-scanned">Sort: Scans</option>
                                    <option value="name-az">Sort: Name A-Z</option>
                                    <option value="name-za">Sort: Name Z-A</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                    {sortBy.includes('asc') || sortBy === 'oldest' || sortBy === 'name-az' ? <FiArrowUp className="h-4 w-4" /> : <FiArrowDown className="h-4 w-4" />}
                                </div>
                            </div>
                            {/* View Toggle */}
                            <div className="inline-flex rounded-md shadow-sm">
                                <button onClick={() => setViewMode('grid')} title="Grid View" className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${viewMode === 'grid' ? 'text-indigo-700 bg-indigo-50 z-10 ring-1 ring-indigo-500 border-indigo-500' : 'text-gray-500 hover:bg-gray-50'}`}> <FiGrid className="h-5 w-5" /> </button>
                                <button onClick={() => setViewMode('list')} title="List View" className={`relative -ml-px inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${viewMode === 'list' ? 'text-indigo-700 bg-indigo-50 z-10 ring-1 ring-indigo-500 border-indigo-500' : 'text-gray-500 hover:bg-gray-50'}`}> <FiList className="h-5 w-5" /> </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area: Conditional Rendering based on data and filters */}
                {qrCodes.length === 0 ? (
                    // 4. Initial Empty State (No QR codes created yet)
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm">
                        <IoQrCodeOutline className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-xl font-semibold text-gray-900">No QR Codes Yet</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Get started by creating your first QR code for a table or general ordering.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={openCreateModal}
                                type="button"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <FiPlus className="-ml-1 mr-2 h-5 w-5" /> Create QR Code
                            </button>
                        </div>
                    </div>
                ) : filteredAndSortedQRCodes.length === 0 ? (
                    // 5. Filtered Empty State (No matches for current filters/search)
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm">
                        <FiSearch className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Matching QR Codes</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search term or filter type.
                        </p>
                        <div className="mt-6">
                            <button type="button" onClick={() => { setSearchTerm(''); setFilterType('all'); }} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> Clear Search & Filters </button>
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (
                    // 6a. Grid View - RESPONSIVE
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-12" // Slightly smaller gap
                        variants={containerVariants} initial="hidden" animate="show"
                        key={`grid-${filterType}-${sortBy}-${searchTerm.length}`}
                    >
                        {filteredAndSortedQRCodes.map((qr) => (
                            <motion.div
                                key={qr._id} variants={itemVariants} layout
                                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col group" // Added group for hover effects
                            >
                                {/* QR Image */}
                                <div className="p-4 flex justify-center bg-gray-50 border-b border-gray-200 relative">
                                    {renderQRCodeComponent(qr, 'h-36 w-36')}
                                    {/* Overlay for copy URL on hover */}
                                    <button
                                        onClick={() => copyToClipboard(qr.targetUrl, qr.name)}
                                        title="Copy Target URL"
                                        className="absolute top-2 right-2 p-1.5 bg-white/70 backdrop-blur-sm rounded-full text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <FiCopy className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Details */}
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="text-base font-semibold text-gray-900 truncate mb-1" title={qr.name}>{qr.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mb-2">
                                        {qr.type === 'table' ? <FiTable className="mr-1.5 h-4 w-4 text-blue-500 flex-shrink-0" /> : <FiShoppingBag className="mr-1.5 h-4 w-4 text-orange-500 flex-shrink-0" />}
                                        <span className="truncate">{qr.type === 'table' ? `Table ${qr.tableNumber}` : 'Pickup/Delivery'}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3 flex items-center" title={qr.targetUrl}>
                                        <FiLink className="mr-1 h-3 w-3 flex-shrink-0" /> <span className="truncate">{qr.targetUrl}</span>
                                    </p>
                                    <p className="text-sm text-gray-500 mt-auto pt-2 border-t border-gray-100">
                                        <span className="font-medium">{qr.scanCount || 0}</span> scans
                                        <span className="mx-1">·</span>
                                        {new Date(qr.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {/* Actions */}
                                <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-around items-center">
                                    <button onClick={() => downloadQrCodeCanvas(qr, 'png')} title="Download PNG" className="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300">
                                        <FiDownload className="w-5 h-5" />
                                    </button>
                                    <a href={`/api/qrcodes/${qr._id}/pdf`} target="_blank" rel="noopener noreferrer" title="View/Print PDF" className="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"> <FiPrinter className="w-5 h-5" /> </a>
                                    <button onClick={() => openEditModal(qr)} title="Edit" className="p-1.5 rounded text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-300"> <FiEdit className="w-5 h-5" /> </button>
                                    <button onClick={() => handleDeleteQR(qr._id)} title="Delete" className="p-1.5 rounded text-red-600 hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-300"> <FiTrash2 className="w-5 h-5" /> </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    // 6b. List View - RESPONSIVE
                    <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-12">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Preview</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / URL</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Table</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Scans</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    <AnimatePresence>
                                        {filteredAndSortedQRCodes.map((qr) => (
                                            <motion.tr
                                                key={qr._id} layout variants={itemVariants} initial="hidden" animate="show" exit="hidden"
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-3 py-3 whitespace-nowrap hidden sm:table-cell">
                                                    {renderQRCodeComponent(qr, 'h-10 w-10')}
                                                </td>
                                                <td className="px-4 py-3 max-w-xs"> {/* Allow wrapping/truncation */}
                                                    <div className="text-sm font-medium text-gray-900 truncate" title={qr.name}>{qr.name}</div>
                                                    <div className="text-xs text-gray-500 truncate" title={qr.targetUrl}>{qr.targetUrl}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${qr.type === 'table' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                        {qr.type === 'table' ? <FiTable className="mr-1 h-3 w-3" /> : <FiShoppingBag className="mr-1 h-3 w-3" />}
                                                        {qr.type === 'table' ? `Table ${qr.tableNumber}` : 'Pickup/Delivery'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{qr.scanCount || 0}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{new Date(qr.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                    {/* Actions slightly more compact */}
                                                    <div className="flex justify-end items-center space-x-2 sm:space-x-3">
                                                        <button onClick={() => copyToClipboard(qr.targetUrl, qr.name)} title="Copy Target URL" className="text-gray-400 hover:text-gray-600 focus:outline-none"> <FiCopy className="w-4 h-4" /> </button>
                                                        <a href={`/api/qrcodes/${qr._id}/image?download=true`} download title="Download PNG" className="text-gray-400 hover:text-gray-600"> <FiDownload className="w-4 h-4" /> </a>
                                                        <a href={`/api/qrcodes/${qr._id}/pdf`} target="_blank" rel="noopener noreferrer" title="View/Print PDF" className="text-gray-400 hover:text-gray-600"> <FiPrinter className="w-4 h-4" /> </a>
                                                        <button onClick={() => openEditModal(qr)} title="Edit" className="text-blue-600 hover:text-blue-800"> <FiEdit className="w-4 h-4" /> </button>
                                                        <button onClick={() => handleDeleteQR(qr._id)} title="Delete" className="text-red-600 hover:text-red-800"> <FiTrash2 className="w-4 h-4" /> </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Create/Edit Modal - RESPONSIVE */}
            <AnimatePresence>
                {(isCreateModalOpen || isEditModalOpen) && (
                    // Added onClick={closeModal} to backdrop
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={closeModal}>
                        <motion.div
                            className="bg-white rounded-lg p-6 w-full max-w-md relative shadow-xl max-h-[90vh] overflow-y-auto" // Added max-height
                            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                            onClick={(e) => e.stopPropagation()} // Prevent close on inner click
                        >
                            <button onClick={closeModal} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Close modal"> <FiX className="h-5 w-5" /> </button>
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6"> {isEditModalOpen ? 'Edit QR Code' : 'Create New QR Code'} </h3>

                            <form onSubmit={isEditModalOpen ? handleSubmitEdit : handleSubmitCreate} className="space-y-5">
                                {/* Form fields */}
                                <div>
                                    <label htmlFor="qr-name" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                    <input type="text" id="qr-name" name="name" required value={formData.name} onChange={handleFormChange} placeholder="e.g., Patio Table 5, Main Entrance" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="qr-type" className="block text-sm font-medium text-gray-700 mb-1">QR Type <span className="text-red-500">*</span></label>
                                    <select id="qr-type" name="type" required value={formData.type} onChange={handleFormChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                                        <option value="table">Table QR (For specific table)</option>
                                        <option value="pickup-delivery">Pickup / Delivery QR (General menu)</option>
                                    </select>
                                </div>
                                {/* Conditional Table Number Input */}
                                <AnimatePresence>
                                    {formData.type === 'table' && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <label htmlFor="qr-tableNumber" className="block text-sm font-medium text-gray-700 mb-1">Table Number <span className="text-red-500">*</span></label>
                                            <input type="number" id="qr-tableNumber" name="tableNumber" required={formData.type === 'table'} value={formData.tableNumber} onChange={handleFormChange} min="0" step="1" placeholder="Enter table number" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {/* Color Picker */}
                                <div>
                                    <label htmlFor="qr-color" className="block text-sm font-medium text-gray-700 mb-1">QR Color</label>
                                    <div className="mt-1 flex items-center space-x-3">
                                        <input type="color" id="qr-color" name="color" value={formData.color} onChange={handleFormChange} className="h-8 w-10 rounded border-gray-300 cursor-pointer" />
                                        <span className="text-sm font-mono p-1 bg-gray-100 rounded">{formData.color}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Choose the color for the QR code pattern.</p>
                                </div>

                                {/* Submission Error */}
                                {submitError && (
                                    <div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-md p-3 flex items-center space-x-2">
                                        <FiAlertCircle className="h-5 w-5 flex-shrink-0" /> <span>{submitError}</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="pt-5 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                                    <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={isSubmitting}> Cancel </button>
                                    <button
                                        type="submit"
                                        className={`inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && <FiLoader className="animate-spin h-5 w-5 mr-2" />}
                                        {isEditModalOpen ? 'Save Changes' : 'Create QR Code'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QrGenerator;
