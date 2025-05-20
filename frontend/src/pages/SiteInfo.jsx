import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Use Link for navigation
import { motion } from 'framer-motion';
import axios from 'axios'; // Import axios
import {
    FiHome, FiSave, FiPlus, FiTrash2, FiEdit, FiX, FiMapPin,
    FiPhone, FiMail, FiGlobe, FiClock, FiArrowLeft, FiImage,
    FiUpload, FiInfo, FiLoader // Added for loading state
} from 'react-icons/fi';

import axiosInstance from '../api/axiosInstance';

// Assume you have an axios instance configured (e.g., with base URL, auth)
// import axiosInstance from './path/to/axiosInstance';
// If not using an instance, use axios directly: axios.get(...), axios.put(...)

const SiteInfo = () => {
    const navigate = useNavigate(); // For potential redirects after save

    // --- State Variables ---
    const [restaurantInfo, setRestaurantInfo] = useState({
        name: '',
        description: '',
        primaryPhone: '',
        email: '',
        website: '',
        logoUrl: null, // URL of the currently saved logo
        coverImageUrl: null, // URL of the currently saved cover image
    });
    const [logoFile, setLogoFile] = useState(null); // Holds the new logo File object
    const [coverImageFile, setCoverImageFile] = useState(null); // Holds the new cover image File object
    const [logoPreview, setLogoPreview] = useState(null); // Holds the temporary preview URL for the new logo
    const [coverImagePreview, setCoverImagePreview] = useState(null); // Holds the temporary preview URL for the new cover image

    const [branches, setBranches] = useState([]);
    const [activeTab, setActiveTab] = useState('basic');
    const [editingBranch, setEditingBranch] = useState(null);
    const [isAddingBranch, setIsAddingBranch] = useState(false);
    const [newBranch, setNewBranch] = useState({
        name: '', address: '', phone: '', hours: '', manager: '', active: true
    });

    // UI States
    const [isLoading, setIsLoading] = useState(true); // For initial data load
    const [isSubmitting, setIsSubmitting] = useState(false); // For saving data
    const [error, setError] = useState(null); // For displaying errors
    const [submitError, setSubmitError] = useState(''); // Specific error for submission failures

    // --- Fetch Initial Data ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // --- Replace Mock with Axios ---
                // Fetch restaurant profile (includes branches based on schema)
                const infoResponse = await axiosInstance.get('/site-info');
                // --- End Axios Call ---
    
                setRestaurantInfo(infoResponse.data);
                setBranches(infoResponse.data.branches || []); // Set branches from profile data
                 // Set initial previews from fetched URLs
                 setLogoPreview(infoResponse.data.logoUrl);
                 setCoverImagePreview(infoResponse.data.coverImageUrl);
    
    
            } catch (err) {
                console.error("Error fetching site info:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Failed to load restaurant information. Please try refreshing the page.");
            } finally {
                setIsLoading(false);
            }
        };
    
        fetchData();
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Handlers ---

    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setRestaurantInfo(prev => ({ ...prev, [name]: value }));
        setSubmitError(''); // Clear previous submit errors on change
    };

    const handleFileChange = (e, fileType) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);

        if (fileType === 'logo') {
            setLogoFile(file);
            setLogoPreview(previewUrl);
        } else if (fileType === 'coverImage') {
            setCoverImageFile(file);
            setCoverImagePreview(previewUrl);
        }
        setSubmitError(''); // Clear previous submit errors
    };

  // Image removal handler (slightly adjusted)
const removeNewImage = (fileType) => {
    if (fileType === 'logo') {
        if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview); // Clean up blob memory
        setLogoFile(null);
        setLogoPreview(restaurantInfo.logoUrl); // Revert preview to original URL
    } else if (fileType === 'coverImage') {
        if (coverImagePreview && coverImagePreview.startsWith('blob:')) URL.revokeObjectURL(coverImagePreview);
        setCoverImageFile(null);
        setCoverImagePreview(restaurantInfo.coverImageUrl); // Revert preview to original URL
    }
};

    // Branch handlers (mostly unchanged, but interact with local state that will be sent)
    const startEditBranch = (branch) => { setEditingBranch(branch); setIsAddingBranch(false); };
    const deleteBranch = (id) => { setBranches(prev => prev.filter(branch => branch.id !== id)); };
    const startAddBranch = () => { setIsAddingBranch(true); setEditingBranch(null); };
    const cancelAction = () => { setEditingBranch(null); setIsAddingBranch(false); };

    const handleBranchChange = (e, isEditing = false) => {
        const { name, value, type, checked } = e.target;
        const fieldValue = type === 'checkbox' ? checked : value;
        const stateSetter = isEditing ? setEditingBranch : setNewBranch;
        stateSetter(prev => ({ ...prev, [name]: fieldValue }));
        setSubmitError('');
    };

    const handleBranchEditSubmit = (e) => {
        e.preventDefault();
        setBranches(prev => prev.map(b => b.id === editingBranch.id ? editingBranch : b));
        setEditingBranch(null);
    };

    const handleNewBranchSubmit = (e) => {
        e.preventDefault();
        const newId = branches.length > 0 ? Math.max(...branches.map(b => b.id)) + 1 : 1; // Simple ID generation
        setBranches(prev => [...prev, { ...newBranch, id: newId }]);
        setNewBranch({ name: '', address: '', phone: '', hours: '', manager: '', active: true });
        setIsAddingBranch(false);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');
        setError(null);
    
        const formDataToSend = new FormData(); // Use 'formDataToSend' to avoid conflict
    
        formDataToSend.append('name', restaurantInfo.name);
        formDataToSend.append('description', restaurantInfo.description);
        formDataToSend.append('primaryPhone', restaurantInfo.primaryPhone);
        formDataToSend.append('email', restaurantInfo.email);
        formDataToSend.append('website', restaurantInfo.website);
        // Add isDeliveryEnabled if managed here (though likely better in Settings)
        if (restaurantInfo.isDeliveryEnabled !== undefined) {
             formDataToSend.append('isDeliveryEnabled', restaurantInfo.isDeliveryEnabled);
        }
    
        // Append branches data (JSON stringify is common)
        formDataToSend.append('branches', JSON.stringify(branches));
    
        // Append new files if they exist
        if (logoFile) {
            formDataToSend.append('logo', logoFile);
        }
        if (coverImageFile) {
            formDataToSend.append('coverImage', coverImageFile);
        }
    
        // Add flags to tell backend if images should be cleared
        // Check if there's NO preview/file AND there WAS an original URL
        if (!logoPreview && !logoFile && restaurantInfo.logoUrl) {
            formDataToSend.append('clearLogo', 'true');
        }
        if (!coverImagePreview && !coverImageFile && restaurantInfo.coverImageUrl) {
            formDataToSend.append('clearCoverImage', 'true');
        }
    
    
        try {
            console.log("Submitting site info...");
            // --- Replace Mock with Axios ---
            // Explicitly set Content-Type for FormData when using axios instance with defaults
            const response = await axiosInstance.put('/site-info', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            // --- End Axios Call ---
    
            console.log('Save successful:', response.data);
    
            // Update state with potentially new URLs returned from backend
            if (response.data.data) {
                const updatedProfile = response.data.data;
                setRestaurantInfo(updatedProfile);
                setBranches(updatedProfile.branches || []);
                // Update previews to reflect saved state
                setLogoPreview(updatedProfile.logoUrl);
                setCoverImagePreview(updatedProfile.coverImageUrl);
            }
    
            // Clear file inputs after successful upload
            setLogoFile(null);
            setCoverImageFile(null);
            // No need to revoke previews here as they now point to the saved URLs
    
            alert('Changes saved successfully!');
    
        } catch (error) {
            console.error('Save error:', error.response?.data || error.message);
            setSubmitError(error.response?.data?.message || `Failed to save changes. Please try again.`);
            setError('An error occurred while saving.');
        } finally {
            setIsSubmitting(false);
        }
    };


    // --- Render Logic ---

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <FiLoader className="animate-spin h-10 w-10 text-indigo-600" />
                <span className="ml-3 text-lg text-gray-700">Loading Restaurant Info...</span>
            </div>
        );
    }

    if (error && !isSubmitting) { // Don't show initial load error if a submit error occurs
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <FiX className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-lg text-red-700 text-center">{error}</p>
                <button
                    onClick={() => window.location.reload()} // Simple refresh action
                    className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Retry
                </button>
                <Link to="/Main" className="mt-2 text-sm text-gray-600 hover:text-indigo-500">
                    Go to Dashboard
                </Link>
            </div>
        );
    }

    // Determine which image URL to display
    const displayLogo = logoPreview || restaurantInfo.logoUrl;
    const displayCoverImage = coverImagePreview || restaurantInfo.coverImageUrl;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            {/* Use Link from react-router-dom */}
                            <Link to="/Main" className="text-gray-500 hover:text-gray-700 mr-3 p-1 rounded-full hover:bg-gray-100">
                                <FiArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-lg font-medium text-gray-900">Restaurant Information</h1>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit} // Use the new handleSubmit
                            disabled={isSubmitting} // Disable button while submitting
                            className={`flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isSubmitting ? (
                                <FiLoader className="animate-spin mr-2 h-4 w-4" />
                            ) : (
                                <FiSave className="mr-2 h-4 w-4" />
                            )}
                            {isSubmitting ? 'Saving...' : 'Save All Changes'}
                        </motion.button>
                    </div>
                </div>
                {/* Display Submission Error */}
                {submitError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{submitError}</p>
                    </div>
                )}
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Tabs navigation */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        {/* Tab buttons remain the same */}
                        <button
                            className={`${activeTab === 'basic' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            onClick={() => setActiveTab('basic')}
                        > Basic Information </button>
                        <button
                            className={`${activeTab === 'branches' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            onClick={() => setActiveTab('branches')}
                        > Branches </button>
                    </nav>
                </div>

                {/* Basic Information */}
                {activeTab === 'basic' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white shadow rounded-lg"
                    >
                        {/* Use form tag to wrap the section if submitting together */}
                        <form onSubmit={handleSubmit}>
                            <div className="p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Profile</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"> {/* Adjusted gap */}
                                    {/* Left column */}
                                    <div>
                                        <div className="mb-4">
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                                Restaurant Name
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                value={restaurantInfo.name}
                                                onChange={handleInfoChange}
                                                // Added py-2 px-3 for slightly better visual size
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                                required // Example: make name required
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                rows={3}
                                                value={restaurantInfo.description}
                                                onChange={handleInfoChange}
                                                // Added py-2 px-3
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="primaryPhone" className="block text-sm font-medium text-gray-700 mb-1">
                                                Primary Phone
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm"> {/* Simplified structure */}
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FiPhone className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                </div>
                                                <input
                                                    type="tel" // Use type="tel" for phone numbers
                                                    name="primaryPhone"
                                                    id="primaryPhone"
                                                    value={restaurantInfo.primaryPhone}
                                                    onChange={handleInfoChange}
                                                    // Added py-2
                                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                                    placeholder="+1 (555) 123-4567"
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email Address
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FiMail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    id="email"
                                                    value={restaurantInfo.email}
                                                    onChange={handleInfoChange}
                                                    // Added py-2
                                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                                    placeholder="you@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                                                Website
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FiGlobe className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                </div>
                                                <input
                                                    type="url" // Use type="url" for websites
                                                    name="website"
                                                    id="website"
                                                    value={restaurantInfo.website}
                                                    onChange={handleInfoChange}
                                                    // Added py-2
                                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                                    placeholder="www.example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right column - Images */}
                                    <div>
                                        {/* Logo Upload */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Restaurant Logo
                                            </label>
                                            <div className="mt-1 p-4 border-2 border-gray-300 border-dashed rounded-md text-center">
                                                {displayLogo ? (
                                                    <div className="mb-2">
                                                        <img
                                                            src={displayLogo} // Show preview OR existing URL
                                                            alt="Restaurant logo"
                                                            className="h-24 w-auto mx-auto object-contain mb-2" // Reduced height slightly
                                                            onError={(e) => { e.target.style.display = 'none'; /* Hide broken image */ }}
                                                        />
                                                        {/* Show remove button only if there's a NEW image selected */}
                                                        {logoPreview && (
                                                            <button
                                                                type="button" // Prevent form submission
                                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                                onClick={() => removeNewImage('logo')}
                                                            >
                                                                <FiTrash2 className="mr-1 h-3 w-3" /> Remove New Logo
                                                            </button>
                                                        )}
                                                        {/* Option to remove existing logo if no new one is selected */}
                                                        {!logoPreview && restaurantInfo.logoUrl && (
                                                            <button
                                                                type="button"
                                                                className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                                                                onClick={() => { setRestaurantInfo(prev => ({ ...prev, logoUrl: null })); /* Also clear backend flag if needed */ }}
                                                            >
                                                                <FiTrash2 className="mr-1 h-3 w-3" /> Remove Existing
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <FiImage className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                                )}

                                                {/* File Input - always available to change */}
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label htmlFor="logo-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                        <span>{displayLogo ? 'Change logo' : 'Upload a logo'}</span>
                                                        <input
                                                            id="logo-upload"
                                                            name="logo-upload"
                                                            type="file"
                                                            accept="image/png, image/jpeg, image/gif" // Specify accepted types
                                                            className="sr-only"
                                                            onChange={(e) => handleFileChange(e, 'logo')}
                                                        />
                                                    </label>
                                                </div>
                                                {!displayLogo && <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 2MB</p>}
                                            </div>
                                        </div>

                                        {/* Cover Image Upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Cover Image
                                            </label>
                                            <div className="mt-1 p-4 border-2 border-gray-300 border-dashed rounded-md text-center">
                                                {displayCoverImage ? (
                                                    <div className="mb-2">
                                                        <img
                                                            src={displayCoverImage} // Show preview OR existing URL
                                                            alt="Restaurant cover"
                                                            className="h-32 w-full mx-auto object-cover rounded mb-2"
                                                            onError={(e) => { e.target.style.display = 'none'; /* Hide broken image */ }}
                                                        />
                                                        {/* Show remove button only if there's a NEW image selected */}
                                                        {coverImagePreview && (
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                                onClick={() => removeNewImage('coverImage')}
                                                            >
                                                                <FiTrash2 className="mr-1 h-3 w-3" /> Remove New Cover
                                                            </button>
                                                        )}
                                                        {/* Option to remove existing cover if no new one is selected */}
                                                        {!coverImagePreview && restaurantInfo.coverImageUrl && (
                                                            <button
                                                                type="button"
                                                                className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                                                                onClick={() => { setRestaurantInfo(prev => ({ ...prev, coverImageUrl: null })); }}
                                                            >
                                                                <FiTrash2 className="mr-1 h-3 w-3" /> Remove Existing
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <FiImage className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                                )}

                                                {/* File Input */}
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label htmlFor="cover-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                        <span>{displayCoverImage ? 'Change cover' : 'Upload a cover image'}</span>
                                                        <input
                                                            id="cover-upload"
                                                            name="cover-upload"
                                                            type="file"
                                                            accept="image/png, image/jpeg, image/gif"
                                                            className="sr-only"
                                                            onChange={(e) => handleFileChange(e, 'coverImage')}
                                                        />
                                                    </label>
                                                </div>
                                                {!displayCoverImage && <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Removed Save button from here, using the main header button */}
                        </form>
                    </motion.div>
                )}

                {/* Branch Management */}
                {activeTab === 'branches' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white shadow rounded-lg overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-medium text-gray-900">Branch Management</h2>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={startAddBranch}
                                    disabled={isAddingBranch || editingBranch || isSubmitting} // Disable if submitting changes
                                    className={`flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${isAddingBranch || editingBranch || isSubmitting
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'text-white bg-indigo-600 hover:bg-indigo-700'
                                        }`}
                                >
                                    <FiPlus className="mr-2 h-4 w-4" />
                                    Add Branch
                                </motion.button>
                            </div>

                            {/* Branch editing form (uses handleBranchEditSubmit which only updates local state) */}
                            {editingBranch && (
                                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                                    {/* Form Content - Kept mostly the same, ensure inputs use py-2 px-3 if desired */}
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-md font-medium text-gray-900">Edit Branch: {editingBranch.name}</h3>
                                        <button onClick={cancelAction} className="text-gray-500 hover:text-gray-700">
                                            <FiX className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleBranchEditSubmit}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Input fields - example with updated classes */}
                                            <div className="col-span-1">
                                                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                                <input type="text" name="name" id="edit-name" value={editingBranch.name} onChange={(e) => handleBranchChange(e, true)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" required />
                                            </div>
                                            <div className="col-span-1">
                                                <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                <input type="tel" name="phone" id="edit-phone" value={editingBranch.phone} onChange={(e) => handleBranchChange(e, true)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            <div className="col-span-2">
                                                <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                <input type="text" name="address" id="edit-address" value={editingBranch.address} onChange={(e) => handleBranchChange(e, true)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            {/* ... other fields (hours, manager) with updated classes */}
                                            <div className="col-span-1">
                                                <label htmlFor="edit-hours" className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                                                <input type="text" name="hours" id="edit-hours" value={editingBranch.hours} onChange={(e) => handleBranchChange(e, true)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            <div className="col-span-1">
                                                <label htmlFor="edit-manager" className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                                                <input type="text" name="manager" id="edit-manager" value={editingBranch.manager} onChange={(e) => handleBranchChange(e, true)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            {/* Active checkbox */}
                                            <div className="col-span-2">
                                                <div className="flex items-start">
                                                    <div className="flex items-center h-5">
                                                        <input id="edit-active" name="active" type="checkbox" checked={editingBranch.active} onChange={(e) => handleBranchChange(e, true)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label htmlFor="edit-active" className="font-medium text-gray-700">Active Branch</label>
                                                        <p className="text-gray-500">Inactive branches won't appear in customer-facing apps.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex justify-end">
                                            <button type="button" onClick={cancelAction} className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                                            <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"><FiSave className="mr-2 h-4 w-4" /> Save Changes</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Add new branch form (uses handleNewBranchSubmit which only updates local state) */}
                            {isAddingBranch && (
                                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                                    {/* Form Content - Kept mostly the same, ensure inputs use py-2 px-3 */}
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-md font-medium text-gray-900">Add New Branch</h3>
                                        <button onClick={cancelAction} className="text-gray-500 hover:text-gray-700">
                                            <FiX className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleNewBranchSubmit}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Input fields - example with updated classes */}
                                            <div className="col-span-1">
                                                <label htmlFor="new-name" className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                                <input type="text" name="name" id="new-name" value={newBranch.name} onChange={(e) => handleBranchChange(e)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" required />
                                            </div>
                                            <div className="col-span-1">
                                                <label htmlFor="new-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                <input type="tel" name="phone" id="new-phone" value={newBranch.phone} onChange={(e) => handleBranchChange(e)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            <div className="col-span-2">
                                                <label htmlFor="new-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                <input type="text" name="address" id="new-address" value={newBranch.address} onChange={(e) => handleBranchChange(e)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            {/* ... other fields (hours, manager) with updated classes */}
                                            <div className="col-span-1">
                                                <label htmlFor="new-hours" className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                                                <input type="text" name="hours" id="new-hours" value={newBranch.hours} onChange={(e) => handleBranchChange(e)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            <div className="col-span-1">
                                                <label htmlFor="new-manager" className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                                                <input type="text" name="manager" id="new-manager" value={newBranch.manager} onChange={(e) => handleBranchChange(e)} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3" />
                                            </div>
                                            {/* Active checkbox */}
                                            <div className="col-span-2">
                                                <div className="flex items-start">
                                                    <div className="flex items-center h-5">
                                                        <input id="new-active" name="active" type="checkbox" checked={newBranch.active} onChange={(e) => handleBranchChange(e)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label htmlFor="new-active" className="font-medium text-gray-700">Active Branch</label>
                                                        <p className="text-gray-500">Inactive branches won't appear in customer-facing apps.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex justify-end">
                                            <button type="button" onClick={cancelAction} className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                                            <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"><FiPlus className="mr-2 h-4 w-4" /> Add Branch</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Branches list - Table structure improved */}
                            <div className="overflow-x-auto shadow border border-gray-200 sm:rounded-lg">
                                {branches.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {branches.map((branch) => (
                                                <tr key={branch.id}>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{branch.address}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{branch.phone}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${branch.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {branch.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        <button
                                                            onClick={() => startEditBranch(branch)}
                                                            disabled={isAddingBranch || editingBranch || isSubmitting}
                                                            className={`text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-100 ${isAddingBranch || editingBranch || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title="Edit Branch"
                                                        >
                                                            <FiEdit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => { if (window.confirm(`Are you sure you want to delete the branch "${branch.name}"? This change is local until saved.`)) deleteBranch(branch.id); }}
                                                            disabled={isAddingBranch || editingBranch || isSubmitting}
                                                            className={`text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100 ${isAddingBranch || editingBranch || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title="Delete Branch"
                                                        >
                                                            <FiTrash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-10 px-6">
                                        <FiInfo className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No branches found</h3>
                                        <p className="mt-1 text-sm text-gray-500">Get started by adding a new branch.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}

export default SiteInfo;
