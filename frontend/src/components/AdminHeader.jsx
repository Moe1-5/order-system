// frontend/src/components/AdminHeader.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiUser, FiLogOut, FiSettings } from 'react-icons/fi'; // Example icons

// You might pass props like `toggleSidebar` or `user` from AdminLayout
const AdminHeader = ({ user, onLogout }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Placeholder user initials
    const userInitials = user?.name ? user.name.substring(0, 1).toUpperCase() : 'U';
    // Placeholder logout function
    const handleLogout = () => {
        console.log("Logout clicked");
        // Implement actual logout logic here (clear token, redirect, etc.)
        // Example: onLogout();
    };

    return (
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-20">
            {/* Left side - App Logo/Name (Could be passed as prop or fixed) */}
            <div className="flex items-center">
                {/* Optional Sidebar Toggle for mobile?
         <button className="md:hidden mr-4 text-gray-500 hover:text-gray-700">
             <FiMenu size={24} />
         </button>
         */}
                <Link to="/main" className="flex items-center text-indigo-600 hover:text-indigo-800">
                    <img src="/ScanPlate.png" alt="ScanPlate Logo" className="h-8 w-auto mr-2" />
                    <span className="text-lg font-medium hidden sm:block">ScanPlate Admin</span>
                </Link>
            </div>

            {/* Right side - Profile Menu */}
            <div className="relative">
                <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    id="user-menu-button"
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                >
                    <span className="sr-only">Open user menu</span>
                    {/* Placeholder User Avatar */}
                    <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-medium group-hover:bg-indigo-200 transition-colors">
                        {userInitials}
                    </span>
                </button>

                {/* Dropdown menu */}
                {isProfileOpen && (
                    <div
                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="user-menu-button"
                        tabIndex="-1"
                    >
                        {/* Active: "bg-gray-100", Not Active: "" */}
                        <div className="px-4 py-3 text-sm text-gray-700 border-b">
                            Signed in as<br />
                            <strong className="truncate">{user?.email || 'Admin User'}</strong>
                        </div>
                        <Link
                            to="/settings" // Link to settings page
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem" tabIndex="-1" id="user-menu-item-0"
                            onClick={() => setIsProfileOpen(false)} // Close dropdown on click
                        >
                            <FiSettings className="mr-2 h-4 w-4 text-gray-400" />
                            Settings
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem" tabIndex="-1" id="user-menu-item-1"
                        >
                            <FiLogOut className="mr-2 h-4 w-4 text-gray-400" />
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AdminHeader;
