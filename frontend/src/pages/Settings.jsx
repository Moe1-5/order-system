import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiBell, FiLogOut, FiCreditCard, FiShield, FiChevronRight, FiHelpCircle, FiEdit, FiTruck, FiLoader } from 'react-icons/fi'; // Added FiTruck, FiLoader
import axiosInstance from '../api/axiosInstance'; // Assuming path is correct for API calls

// --- Reusable Toggle Switch Component ---
const ToggleSwitch = ({ enabled, onChange, labelId, disabled = false }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-labelledby={labelId}
            onClick={onChange}
            disabled={disabled}
            className={`${enabled ? 'bg-indigo-600' : 'bg-gray-300'} relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
            />
        </button>
    );
};
// --- End Toggle Switch Component ---


const Settings = () => {
    const navigate = useNavigate();
    const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(false); // State for delivery toggle
    const [isLoadingDelivery, setIsLoadingDelivery] = useState(true); // Loading state for fetching delivery setting
    const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false); // Loading state for saving delivery setting
    const [error, setError] = useState(null); // General error state

    // Fetch initial settings (like delivery status)
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoadingDelivery(true); // Use specific loading state
            setError(null);
            try {
                // --- Replace Mock with Axios ---
                // Fetch from site-info as the schema includes the setting
                const response = await axiosInstance.get('/site-info');
                // --- End Axios Call ---

                // Assuming response.data contains the full profile
                setIsDeliveryEnabled(response.data?.isDeliveryEnabled || false); // Default to false if not found

            } catch (err) {
                console.error("Error fetching settings:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Could not load settings. Please try again.");
                // Set default on error?
                setIsDeliveryEnabled(false);
            } finally {
                setIsLoadingDelivery(false);
            }
        };
        fetchSettings();
    }, []);


    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
        console.log("User logged out");
    };

    const handleChangePassword = () => {
        alert("Password change functionality not implemented yet.");
    };

    // Handle Delivery Toggle Change
    // --- Handle Delivery Toggle ---
    const handleDeliveryToggle = async () => {
        const newValue = !isDeliveryEnabled;
        setIsUpdatingDelivery(true);
        setError(null);

        try {
            // Optimistic UI update
            setIsDeliveryEnabled(newValue);

            // --- Replace Mock with Axios ---
            // Update via the site-info endpoint as the field is there
            // Alternatively, create a dedicated settings endpoint
            await axiosInstance.put('/site-info', { isDeliveryEnabled: newValue });
            // If using a dedicated endpoint:
            // await axiosInstance.put('/settings/operational', { isDeliveryEnabled: newValue });
            // --- End Axios Call ---

            console.log("Delivery setting updated to:", newValue);
            // Optional: Show success notification

        } catch (err) {
            console.error("Error updating delivery setting:", err.response?.data || err.message);
            setError(err.response?.data?.message || "Failed to update delivery setting. Please try again.");
            // Revert optimistic update on error
            setIsDeliveryEnabled(!newValue);
        } finally {
            setIsUpdatingDelivery(false);
        }
    };


    const settingsSections = [
        {
            title: "Account",
            items: [
                { id: "profile", name: "Profile Information", description: "Update your name, email, and restaurant details.", icon: FiUser, link: "/site-info", action: null },
                { id: "password", name: "Change Password", description: "Update your account password.", icon: FiLock, link: null, action: handleChangePassword },
            ]
        },
        // --- New Operations Section ---
        {
            title: "Operations",
            items: [
                {
                    id: "delivery",
                    name: "Enable Delivery Orders",
                    description: "Allow customers to place orders for delivery.",
                    icon: FiTruck, // Use truck icon
                    link: null,
                    action: handleDeliveryToggle, // Use the handler
                    isToggle: true,
                    isLoading: isLoadingDelivery, // Pass loading state
                    isUpdating: isUpdatingDelivery, // Pass updating state
                    currentValue: isDeliveryEnabled // Pass current value
                },
                // Add future toggles here (e.g., Enable Pickup Orders)
                // { id: "pickup", name: "Enable Pickup Orders", ... }
            ]
        },
        // --- End Operations Section ---
        {
            title: "Notifications",
            items: [
                { id: "email_notify", name: "Email Notifications", description: "Manage email alerts for orders, system updates, etc.", icon: FiBell, link: null, action: () => alert("Notification settings not implemented yet."), isToggle: true },
            ]
        },
        {
            title: "Security",
            items: [
                { id: "logout", name: "Logout", description: "Sign out of your current session.", icon: FiLogOut, link: null, action: handleLogout, isDestructive: true },
            ]
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Styled Header Title */}
                        <h1 className="text-xl font-semibold text-indigo-600">Settings</h1>
                        <Link to="/Main" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            Dashboard
                        </Link>
                    </div>
                </div>
                {/* Global Error Display */}
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3" role="alert">
                        <p>{error}</p>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {settingsSections.map((section) => (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white shadow-md rounded-lg overflow-hidden"
                        >
                            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                                <h2 className="text-lg font-medium leading-6 text-gray-900">{section.title}</h2>
                            </div>
                            <ul className="divide-y divide-gray-200">
                                {section.items.map((item) => (
                                    <li key={item.id}> {/* Use unique ID */}
                                        {item.link ? (
                                            <Link to={item.link} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                                <div className="flex items-center px-4 py-4 sm:px-6">
                                                    <div className="min-w-0 flex-1 flex items-center">
                                                        <div className={`flex-shrink-0 p-2 rounded-full ${item.isDestructive ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                            <item.icon className="h-5 w-5" aria-hidden="true" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                                            <div>
                                                                <p className={`text-sm font-medium truncate ${item.isDestructive ? 'text-red-600' : 'text-indigo-600'}`}>{item.name}</p>
                                                                <p className="mt-1 flex items-center text-sm text-gray-500 truncate">{item.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <FiChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ) : (
                                            // --- Button/Toggle Row ---
                                            <div className="flex items-center px-4 py-4 sm:px-6 justify-between hover:bg-gray-50">
                                                {/* Left Side (Icon, Text) */}
                                                <div className="flex items-center flex-1 min-w-0">
                                                    <div className={`flex-shrink-0 p-2 rounded-full ${item.isDestructive ? 'bg-red-100 text-red-600' : item.isToggle ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-600'}`}>
                                                        <item.icon className="h-5 w-5" aria-hidden="true" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 px-4">
                                                        <button
                                                            id={item.id} // Add id for label association if needed
                                                            onClick={item.action}
                                                            disabled={item.isToggle ? (item.isLoading || item.isUpdating) : false} // Disable button/label if toggle is loading/updating
                                                            className={`text-sm font-medium text-left w-full truncate ${item.isDestructive ? 'text-red-600 hover:text-red-800' : 'text-gray-800 hover:text-gray-900'} disabled:opacity-70 disabled:cursor-default`}
                                                        >
                                                            {item.name}
                                                        </button>
                                                        <p className="mt-1 flex items-center text-sm text-gray-500 truncate">{item.description}</p>
                                                    </div>
                                                </div>

                                                {/* Right Side (Arrow or Toggle) */}
                                                <div className="flex-shrink-0 ml-4">
                                                    {item.isToggle ? (
                                                        item.isLoading ? (
                                                            <FiLoader className="h-5 w-5 text-gray-400 animate-spin" />
                                                        ) : (
                                                            <ToggleSwitch
                                                                enabled={item.currentValue}
                                                                onChange={item.action}
                                                                labelId={item.id}
                                                                disabled={item.isUpdating} // Disable during update
                                                            />
                                                        )
                                                    ) : !item.isDestructive ? ( // Don't show arrow for logout
                                                        <button onClick={item.action} className="text-gray-400 hover:text-gray-600 p-1">
                                                            <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                                                        </button>
                                                    ) : (
                                                        // Provide visual feedback for logout action button
                                                        <button onClick={item.action} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                                                            <FiLogOut className="h-5 w-5" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            // --- End Button/Toggle Row ---
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Settings;
