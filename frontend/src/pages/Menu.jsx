// src/pages/Menu.jsx (or wherever this component lives in your admin frontend)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance'; // Your configured Axios instance
import {
    FiHome, FiEdit, FiTrash2, FiPlus, FiFilter, FiChevronDown, FiSearch,
    FiMenu, FiX, FiUpload, FiCheck, FiAlertCircle, FiImage, FiLoader,
    FiDollarSign, FiTag, FiArrowUp, FiArrowDown, FiXCircle // Added Sort Icons
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

// --- Define Hardcoded Categories ---
const HARDCODED_CATEGORIES = ['Appetizers', 'Main Courses', 'Desserts', 'Beverages', 'Specials'];
// Include 'All' for the filter tabs
const ALL_CATEGORIES_FOR_TABS = ['All', ...HARDCODED_CATEGORIES];
const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOption, setFilterOption] = useState('all');
    const [sortOption, setSortOption] = useState('category-asc');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submitError, setSubmitError] = useState('');

    // State for modal inputs
    const [componentInput, setComponentInput] = useState('');
    const [extraNameInput, setExtraNameInput] = useState('');
    const [extraPriceInput, setExtraPriceInput] = useState('');

    const [formData, setFormData] = useState({
        _id: null, name: '', price: '',
        category: HARDCODED_CATEGORIES[0] || '',
        description: '', isAvailable: true, itemImage: null, imageUrl: null,
        components: [],
        extras: [],
    });

    const fileInputRef = useRef(null);
    const filterDropdownRef = useRef(null);
    const sortDropdownRef = useRef(null);

    const fetchMenuData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/menu');
            setMenuItems(response.data.menuItems || []);
        } catch (err) {
            console.error("Error fetching menu data:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || "Failed to load menu. Please try refreshing.");
            setMenuItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const resetModalFormState = () => {
        setFormData({
            _id: null, name: '', price: '',
            category: HARDCODED_CATEGORIES[0] || '',
            description: '', isAvailable: true, itemImage: null, imageUrl: null,
            components: [],
            extras: [],
        });
        setComponentInput('');
        setExtraNameInput('');
        setExtraPriceInput('');
        setSubmitError('');
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const openAddModal = () => {
        resetModalFormState();
        setIsAddModalOpen(true);
    };

    const openEditModal = (item) => {
        setCurrentItem(item);
        setFormData({
            _id: item._id,
            name: item.name || '',
            price: item.price?.toString() || '',
            category: HARDCODED_CATEGORIES.includes(item.category) ? item.category : (HARDCODED_CATEGORIES[0] || ''),
            description: item.description || '',
            isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
            itemImage: null,
            imageUrl: item.imageUrl || null,
            components: Array.isArray(item.components) ? [...item.components] : [],
            extras: Array.isArray(item.extras) ? item.extras.map(ex => ({ name: ex.name || '', price: parseFloat(ex.price) || 0 })) : [],
        });
        setComponentInput('');
        setExtraNameInput('');
        setExtraPriceInput('');
        setSubmitError('');
        setIsEditModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setCurrentItem(null);
        resetModalFormState();
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleComponentInputChange = (e) => setComponentInput(e.target.value);
    const handleComponentEnter = (e) => {
        if (e.key === 'Enter' && componentInput.trim() !== '') {
            e.preventDefault();
            const newComponent = componentInput.trim();
            if (!formData.components.find(comp => comp.toLowerCase() === newComponent.toLowerCase())) {
                setFormData(prev => ({ ...prev, components: [...prev.components, newComponent] }));
            }
            setComponentInput('');
        }
    };
    const removeComponent = (componentToRemove) => {
        setFormData(prev => ({ ...prev, components: prev.components.filter(comp => comp !== componentToRemove) }));
    };

    const handleExtraNameChange = (e) => setExtraNameInput(e.target.value);
    const handleExtraPriceChange = (e) => setExtraPriceInput(e.target.value);
    const addExtraItem = () => {
        const name = extraNameInput.trim();
        const price = parseFloat(extraPriceInput);
        if (name && !isNaN(price) && price >= 0) {
            if (formData.extras.find(ex => ex.name.toLowerCase() === name.toLowerCase())) {
                setSubmitError(`Extra "${name}" already exists.`); return;
            }
            setSubmitError('');
            setFormData(prev => ({ ...prev, extras: [...prev.extras, { name, price }] }));
            setExtraNameInput(''); setExtraPriceInput('');
        } else {
            setSubmitError("Extra name is required and price must be a valid number (0 or more).");
        }
    };
    const removeExtraItem = (extraNameToRemove) => {
        setFormData(prev => ({ ...prev, extras: prev.extras.filter(extra => extra.name !== extraNameToRemove) }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { setSubmitError("File size exceeds 5MB."); return; }
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setSubmitError("Invalid file type (PNG, JPG, WEBP only)."); return; }
            setSubmitError('');
            setFormData(prev => ({ ...prev, itemImage: file, imageUrl: URL.createObjectURL(file) }));
        }
    };
    const removeImage = () => {
        if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) URL.revokeObjectURL(formData.imageUrl);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFormData(prev => ({ ...prev, itemImage: null, imageUrl: currentItem?.imageUrl && isEditModalOpen ? currentItem.imageUrl : null })); // Revert to original if editing
    };


    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setIsSubmitting(true);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('price', formData.price);
        data.append('category', formData.category);
        data.append('description', formData.description);
        data.append('isAvailable', formData.isAvailable);
        data.append('components', JSON.stringify(formData.components));
        data.append('extras', JSON.stringify(formData.extras));

        if (formData.itemImage) { // A new file was selected
            data.append('itemImage', formData.itemImage);
        } else if (isEditModalOpen && !formData.imageUrl && currentItem?.imageUrl) {
            // Image was cleared in edit mode, and no new one was selected
            data.append('removeImage', 'true');
        }
        // If formData.imageUrl is the original URL (not blob) and itemImage is null, no 'itemImage' or 'removeImage' is sent, backend keeps old image.

        try {
            let response;
            if (isEditModalOpen && formData._id) {
                response = await axiosInstance.put(`/menu/${formData._id}`, data);
                setMenuItems(prev => prev.map(item => item._id === formData._id ? response.data : item));
            } else {
                response = await axiosInstance.post('/menu', data);
                setMenuItems(prev => [response.data, ...prev].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))); // Add and sort
            }
            closeModal();
        } catch (err) {
            console.error(`Error ${isEditModalOpen ? 'updating' : 'adding'} menu item:`, err.response?.data || err.message, err);
            setSubmitError(err.response?.data?.message || `Failed to ${isEditModalOpen ? 'update' : 'add'} item.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Correct definition for handleDeleteConfirm
    const handleDeleteConfirm = (itemId) => {
        setItemToDelete(itemId);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        const itemBeingDeleted = menuItems.find(item => item._id === itemToDelete);
        if (!itemBeingDeleted) { setShowDeleteConfirm(false); setItemToDelete(null); return; }

        const originalItems = [...menuItems]; // Store original for potential revert
        setMenuItems(prev => prev.filter(item => item._id !== itemToDelete)); // Optimistic UI
        setShowDeleteConfirm(false);
        setError(null);

        try {
            await axiosInstance.delete(`/menu/${itemToDelete}`); // Corrected: Use itemToDelete directly
            setItemToDelete(null);
        } catch (err) {
            console.error("Error deleting menu item:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || "Failed to delete item. Please refresh.");
            setMenuItems(originalItems); // Revert on failure
            setItemToDelete(null);
        }
    };
    const handleToggleAvailability = async (item) => {
        const originalAvailability = item.isAvailable;
        const updatedAvailability = !originalAvailability;

        // Optimistic UI update
        setMenuItems(prev => prev.map(i =>
            i._id === item._id ? { ...i, isAvailable: updatedAvailability } : i
        ));
        setError(null); // Clear previous page errors

        try {
            // PATCH request with the new availability status
            await axiosInstance.patch(`/menu/${item._id}/availability`, { isAvailable: updatedAvailability });
            // Success! No action needed.
            // Optional: Show success notification
        } catch (err) {
            console.error("Error toggling availability:", err.response?.data || err.message, err);
            setError(err.response?.data?.message || `Failed to update availability for ${item.name}.`);
            // Revert optimistic update
            setMenuItems(prev => prev.map(i =>
                i._id === item._id ? { ...i, isAvailable: originalAvailability } : i
            ));
        }
    };

    // === Filtering and Sorting (Memoized) ===
    const filteredAndSortedItems = useMemo(() => {
        // Ensure menuItems is always an array before filtering/sorting
        const itemsToProcess = Array.isArray(menuItems) ? menuItems : [];

        return itemsToProcess
            .filter(item => {
                // Check if item exists and has necessary properties
                if (!item || typeof item.name !== 'string') return false;

                const categoryMatch = activeTab === 'all' || (item.category && item.category.toLowerCase() === activeTab.toLowerCase());
                const availabilityMatch = filterOption === 'all' || (filterOption === 'available' && item.isAvailable === true) || (filterOption === 'unavailable' && item.isAvailable === false);
                const searchMatch = !searchQuery ||
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.description && typeof item.description === 'string' && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
                return categoryMatch && availabilityMatch && searchMatch;
            })
            .sort((a, b) => {
                switch (sortOption) {
                    case 'name-asc': return (a.name || '').localeCompare(b.name || '');
                    case 'name-desc': return (b.name || '').localeCompare(a.name || '');
                    case 'price-asc': return (a.price || 0) - (b.price || 0);
                    case 'price-desc': return (b.price || 0) - (a.price || 0);
                    case 'category-asc': return (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''); // Sort by cat, then name
                    case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    case 'oldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                    default: return 0;
                }
            });
    }, [menuItems, activeTab, filterOption, searchQuery, sortOption]); // Dependencies

    // === Animation Variants ===
    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const itemVariants = { hidden: { y: 15, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } };
    const modalVariants = { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }, exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } } };
    const dropdownVariants = { hidden: { opacity: 0, y: -5, height: 0 }, visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.2 } }, exit: { opacity: 0, y: -5, height: 0, transition: { duration: 0.1 } } };

    // === Render Logic ===

    // 1. Initial Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <FiLoader className="animate-spin h-10 w-10 text-indigo-600" />
                <span className="ml-3 text-lg text-gray-700">Loading Menu...</span>
            </div>
        );
    }

    // 2. Fetch Error State (if loading failed and we have no items)
    if (error && !Array.isArray(menuItems) && !isLoading) { // Check specifically if menuItems isn't an array due to error
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <FiAlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg font-medium text-red-700 mb-2">Failed to Load Menu</p>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                    onClick={fetchMenuData} // Allow retry
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
                        <Link to="/dahsboard" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 flex-shrink-0">
                            <FiHome className="h-6 w-6" />
                            <span className="font-bold text-lg sm:inline">ScanPlate</span>
                        </Link>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                <FiPlus className="-ml-1 mr-2 h-5 w-5" /> Add Item
                            </motion.button>
                            <div className="relative"> <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium"> U </span> </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Floating Add Button */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={openAddModal} className="sm:hidden fixed bottom-6 right-6 z-40 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none" aria-label="Add Menu Item"> <FiPlus className="h-6 w-6" /> </motion.button>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Page Header & Non-critical Errors */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl"> Restaurant Menu </h1>
                    {/* Display non-blocking errors (e.g., delete/toggle failure) */}
                    {error && !isLoading && Array.isArray(menuItems) && menuItems.length > 0 && (
                        <div className="mt-3 bg-red-50 border border-red-200 text-sm text-red-800 rounded-md p-3 flex items-center space-x-2">
                            <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                            <span>Error: {error}</span>
                            <button onClick={() => setError(null)} className="ml-auto text-red-800 hover:text-red-900 focus:outline-none"> <FiX className="h-4 w-4" /> </button>
                        </div>
                    )}
                </div>

                {/* Action Bar (Search, Filter, Sort) - Only show if items exist */}
                {Array.isArray(menuItems) && menuItems.length > 0 && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Search */}
                            <div className="relative flex-grow sm:flex-grow-0 sm:w-64 md:w-72">
                                <label htmlFor="search-menu" className="sr-only">Search Menu Items</label>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FiSearch className="h-5 w-5 text-gray-400" /> </div>
                                <input type="search" id="search-menu" placeholder="Search name or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            {/* Filters & Sort */}
                            <div className="flex items-center flex-wrap justify-start sm:justify-end gap-3">
                                {/* Availability Filter */}
                                <div className="relative" ref={filterDropdownRef}>
                                    <button onClick={() => setShowFilterDropdown(prev => !prev)} className="inline-flex items-center justify-center whitespace-nowrap h-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                        <FiFilter className="h-4 w-4 mr-1.5 text-gray-400" />
                                        {filterOption === 'all' ? 'All Status' : filterOption === 'available' ? 'Available' : 'Unavailable'}
                                        <FiChevronDown className="-mr-0.5 ml-1.5 h-4 w-4 text-gray-400" />
                                    </button>
                                    <AnimatePresence> {showFilterDropdown && (
                                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                            <div className="py-1">
                                                <button onClick={() => { setFilterOption('all'); setShowFilterDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${filterOption === 'all' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>All Status</button>
                                                <button onClick={() => { setFilterOption('available'); setShowFilterDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${filterOption === 'available' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Available</button>
                                                <button onClick={() => { setFilterOption('unavailable'); setShowFilterDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${filterOption === 'unavailable' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Unavailable</button>
                                            </div>
                                        </motion.div>
                                    )} </AnimatePresence>
                                </div>
                                {/* Sort Options */}
                                <div className="relative" ref={sortDropdownRef}>
                                    <button onClick={() => setShowSortDropdown(prev => !prev)} className="inline-flex items-center justify-center whitespace-nowrap h-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                        {sortOption.includes('asc') || sortOption === 'oldest' || sortOption === 'category-asc' || sortOption === 'name-asc' || sortOption === 'price-asc' ? <FiArrowUp className="h-4 w-4 mr-1.5 text-gray-400" /> : <FiArrowDown className="h-4 w-4 mr-1.5 text-gray-400" />}
                                        Sort By...
                                        <FiChevronDown className="-mr-0.5 ml-1.5 h-4 w-4 text-gray-400" />
                                    </button>
                                    <AnimatePresence> {showSortDropdown && (
                                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                            <div className="py-1">
                                                {/* Add current sort indication */}
                                                <button onClick={() => { setSortOption('category-asc'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'category-asc' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Category (A-Z)</button>
                                                <button onClick={() => { setSortOption('name-asc'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'name-asc' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Name (A-Z)</button>
                                                <button onClick={() => { setSortOption('name-desc'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'name-desc' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Name (Z-A)</button>
                                                <button onClick={() => { setSortOption('price-asc'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'price-asc' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Price (Low-High)</button>
                                                <button onClick={() => { setSortOption('price-desc'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'price-desc' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Price (High-Low)</button>
                                                <button onClick={() => { setSortOption('newest'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'newest' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Newest</button>
                                                <button onClick={() => { setSortOption('oldest'); setShowSortDropdown(false); }} className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'oldest' ? 'font-semibold text-indigo-600 bg-gray-50' : 'text-gray-700 hover:bg-gray-100'}`}>Oldest</button>
                                            </div>
                                        </motion.div>
                                    )} </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Tabs */}
                {Array.isArray(menuItems) && menuItems.length > 0 && ( // Only show tabs if items exist
                    <div className="mb-6 bg-white rounded-lg shadow-sm">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-6 sm:space-x-8 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                                {ALL_CATEGORIES_FOR_TABS.map((category) => (
                                    <button key={category} onClick={() => setActiveTab(category.toLowerCase())}
                                        className={`flex-shrink-0 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${activeTab === category.toLowerCase() ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                    > {category === 'All' ? 'All Items' : category} </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}

                {/* Content Display Area */}
                {/* Case 1: Initial State - No items yet */}
                {!isLoading && (!Array.isArray(menuItems) || menuItems.length === 0) && (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm mt-6"> {/* Added mt-6 */}
                        <FiMenu className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Your Menu is Empty</h3>
                        <p className="mt-1 text-sm text-gray-500">Add your first menu item to get started.</p>
                        <div className="mt-6"> <button onClick={openAddModal} type="button" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> <FiPlus className="-ml-1 mr-2 h-5 w-5" /> Add Menu Item </button> </div>
                    </div>
                )}
                {/* Case 2: Items exist, but filters match none */}
                {!isLoading && Array.isArray(menuItems) && menuItems.length > 0 && filteredAndSortedItems.length === 0 && (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm mt-6"> {/* Added mt-6 */}
                        <FiSearch className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Matching Items Found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
                        <div className="mt-6"> <button type="button" onClick={() => { setSearchQuery(''); setFilterOption('all'); setActiveTab('all'); setSortOption('category-asc'); }} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> Clear Filters & Search </button> </div>
                    </div>
                )}
                {/* Case 3: Items exist and filters match some */}
                {!isLoading && filteredAndSortedItems.length > 0 && (
                    <motion.div className="grid grid-cols-1 gap-4 mb-12" variants={containerVariants} initial="hidden" animate="show" key={activeTab + filterOption + sortOption + searchQuery.length}>
                        {filteredAndSortedItems.map((item) => {
                            const statusText = item.isAvailable ? 'Available' : 'Unavailable';
                            const statusColor = item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                            const priceFormatted = (typeof item.price === 'number' ? item.price : 0).toFixed(2);

                            return (
                                <motion.div key={item._id} variants={itemVariants} layout className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 flex items-center"> {/* Added items-center */}
                                    {/* Image Container */}
                                    <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 bg-gray-50"> {/* Added bg */}
                                        {item.imageUrl ? (
                                            <img className="w-full h-full object-cover" src={item.imageUrl} alt={item.name || ''} onError={(e) => e.target.style.display = 'none'} loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"> <FiImage className="w-8 h-8 sm:w-10 sm:h-10" /> </div>
                                        )}
                                    </div>
                                    {/* Content Container */}
                                    <div className="flex-1 p-3 sm:p-4 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mr-2" title={item.name}> {item.name} </h3>
                                                <p className="text-base sm:text-lg font-bold text-indigo-600 flex-shrink-0 whitespace-nowrap"> ${priceFormatted} </p>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 mb-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium"> <FiTag className="h-3 w-3 mr-1" /> {item.category || 'Uncategorized'} </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${statusColor}`}> {statusText} </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2" title={item.description}> {item.description || ''} </p>
                                        </div>
                                        <div className="flex items-center justify-end space-x-1 sm:space-x-1.5 mt-2">
                                            {/* Action Buttons */}
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleToggleAvailability(item)} className={`p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 ${item.isAvailable ? 'text-green-600 hover:bg-green-100 focus:ring-green-500' : 'text-gray-500 hover:bg-gray-100 focus:ring-gray-400'}`} title={item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}> {item.isAvailable ? <FiCheck className="h-4 w-4 sm:h-5 sm:w-5" /> : <FiX className="h-4 w-4 sm:h-5 sm:w-5" />} </motion.button>
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditModal(item)} className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500" title="Edit Item"> <FiEdit className="h-4 w-4 sm:h-5 sm:w-5" /> </motion.button>
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteConfirm(item._id)} className="p-1.5 rounded-full text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500" title="Delete Item"> <FiTrash2 className="h-4 w-4 sm:h-5 sm:w-5" /> </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {/* --- Add/Edit Modal --- */}
                <AnimatePresence>
                    {(isAddModalOpen || isEditModalOpen) && (
                        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={closeModal}>
                            <motion.div className="bg-white rounded-lg p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                                <button onClick={closeModal} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Close modal"> <FiX className="h-5 w-5" /> </button>
                                <h3 className="text-xl font-semibold text-gray-900 mb-6"> {isEditModalOpen ? 'Edit Menu Item' : 'Add New Menu Item'} </h3>
                                <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="space-y-5">
                                    {/* Item Name, Price, Category, Description remain the same */}
                                    <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Item Name <span className="text-red-500">*</span></label> <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /> </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div> <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Base Price ($) <span className="text-red-500">*</span></label> <div className="relative mt-1"> <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FiDollarSign className="h-5 w-5 text-gray-400" /> </div> <input type="number" id="price" name="price" required value={formData.price} onChange={handleInputChange} step="0.01" min="0" className="block w-full pl-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /> </div> </div>
                                        <div> <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label> <select id="category" name="category" required value={formData.category} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"> {HARDCODED_CATEGORIES.map((category) => (<option key={category} value={category}>{category}</option>))} </select> </div>
                                    </div>
                                    <div> <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label> <textarea id="description" name="description" rows="3" value={formData.description} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea> </div>

                                    {/* Default Components Section (formerly AddOns) */}
                                    <div className="pt-2">
                                        <label htmlFor="componentInput" className="block text-sm font-medium text-gray-700 mb-1">
                                            Default Components (e.g., Lettuce, Tomato - Press Enter to add)
                                        </label>
                                        <div className="flex items-center">
                                            <FiArchive className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                                            <input
                                                type="text"
                                                id="componentInput"
                                                name="componentInput"
                                                value={componentInput}
                                                onChange={handleComponentInputChange}
                                                onKeyDown={handleComponentEnter}
                                                placeholder="Type default ingredient"
                                                className="flex-grow block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        {formData.components && formData.components.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {formData.components.map((component, index) => (
                                                    <motion.span /* ... (same animation as addOns previously) ... */
                                                        key={index}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300"
                                                    >
                                                        {component}
                                                        <button type="button" onClick={() => removeComponent(component)} className="ml-1.5 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none" aria-label={`Remove ${component}`}>
                                                            <FiXCircle className="h-3.5 w-3.5" />
                                                        </button>
                                                    </motion.span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Extras Section - NEW */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Optional Extras (e.g., Extra Cheese, Bacon - Specify Name & Price)
                                        </label>
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="flex-grow">
                                                <label htmlFor="extraNameInput" className="sr-only">Extra Name</label>
                                                <input
                                                    type="text"
                                                    id="extraNameInput"
                                                    value={extraNameInput}
                                                    onChange={handleExtraNameChange}
                                                    placeholder="Extra Name (e.g., Extra Cheese)"
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                            </div>
                                            <div className="w-28 flex-shrink-0">
                                                <label htmlFor="extraPriceInput" className="sr-only">Extra Price</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FiDollarSign className="h-5 w-5 text-gray-400" /> </div>
                                                    <input
                                                        type="number"
                                                        id="extraPriceInput"
                                                        value={extraPriceInput}
                                                        onChange={handleExtraPriceChange}
                                                        placeholder="Price"
                                                        step="0.01" min="0"
                                                        className="block w-full pl-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addExtraItem}
                                                className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                title="Add this extra"
                                            >
                                                <FiPlusSquare className="h-5 w-5" />
                                                <span className="sr-only">Add Extra</span>
                                            </button>
                                        </div>
                                        {/* Display added extras */}
                                        {formData.extras && formData.extras.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {formData.extras.map((extra, index) => (
                                                    <motion.span /* ... (similar animation) ... */
                                                        key={index} // Consider a more stable key if extras could be reordered, e.g., extra.name if unique
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300"
                                                    >
                                                        {extra.name} (+${extra.price.toFixed(2)})
                                                        <button type="button" onClick={() => removeExtraItem(extra.name)} className="ml-1.5 flex-shrink-0 text-green-500 hover:text-green-700 focus:outline-none" aria-label={`Remove ${extra.name}`}>
                                                            <FiXCircle className="h-3.5 w-3.5" />
                                                        </button>
                                                    </motion.span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Image Upload */}
                                    <div> <label className="block text-sm font-medium text-gray-700 mb-1">Item Image</label> <div className="mt-1 flex items-center space-x-4"> <div className="flex-shrink-0 h-20 w-20 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden"> {formData.imageUrl ? (<img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />) : (<FiImage className="h-10 w-10 text-gray-400" />)} </div> <div className="flex flex-col space-y-2"> <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> <FiUpload className="h-4 w-4 mr-2" /> {formData.imageUrl ? 'Change Image' : 'Upload Image'} </button> {formData.imageUrl && (<button type="button" onClick={removeImage} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"> <FiTrash2 className="h-4 w-4 mr-2" /> Remove Image </button>)} <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" /> </div> </div> <p className="text-xs text-gray-500 mt-1">Upload PNG, JPG, or WEBP (Max 5MB).</p> </div>
                                    {/* Availability Checkbox */}
                                    <div className="flex items-start"> <div className="flex items-center h-5"> <input id="isAvailable" name="isAvailable" type="checkbox" checked={formData.isAvailable} onChange={handleInputChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer" /> </div> <div className="ml-3 text-sm"> <label htmlFor="isAvailable" className="font-medium text-gray-700 cursor-pointer">Item is Available</label> <p className="text-gray-500">Customers can order this item when checked.</p> </div> </div>
                                    {/* Submission Error Message */}
                                    {submitError && (<div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-md p-3 flex items-center space-x-2"> <FiAlertCircle className="h-5 w-5 flex-shrink-0" /> <span>{submitError}</span> </div>)}
                                    {/* Action Buttons */}
                                    <div className="pt-5 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                                        <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={isSubmitting} > Cancel </button>
                                        <button type="submit" className={`inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`} disabled={isSubmitting} >
                                            {isSubmitting && <FiLoader className="animate-spin h-5 w-5 mr-2" />}
                                            {isEditModalOpen ? 'Save Changes' : 'Add Item'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* --- Delete Confirmation Modal --- */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
                            <motion.div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"> <FiAlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" /> </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Menu Item</h3>
                                        <div className="mt-2"> <p className="text-sm text-gray-500">Are you sure? This action cannot be undone.</p> </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm" onClick={handleDelete}> Delete </button>
                                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm" onClick={() => setShowDeleteConfirm(false)}> Cancel </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </main>
        </div>
    );
};

export default Menu;
