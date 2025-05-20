// frontend/src/components/AdminSidebar.jsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom'; // Use NavLink for active styling
import {
    FiHome, FiSettings, FiMapPin, FiMenu, FiShoppingBag,
    FiBarChart2, FiBriefcase // Add other icons as needed
} from 'react-icons/fi';
import { IoQrCodeOutline } from "react-icons/io5";

// Define navigation items
const navigation = [
    { name: 'Dashboard', href: '/main', icon: FiHome },
    { name: 'Orders', href: '/orders', icon: FiShoppingBag },
    { name: 'Menu', href: '/menu', icon: FiMenu },
    { name: 'QR Codes', href: '/qr-settings', icon: IoQrCodeOutline },
    { name: 'Site Info', href: '/site-info', icon: FiBriefcase },
    // { name: 'Analytics', href: '/analytics', icon: FiBarChart2 }, // Add if you have this page
    { name: 'Settings', href: '/settings', icon: FiSettings },
];

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const AdminSidebar = () => {
    return (
        // Basic sidebar structure - adjust width, colors, responsiveness as needed
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
                {/* Optional Logo area */}
                <div className="flex items-center flex-shrink-0 px-4 mb-5">
                    <Link to="/main" className="flex items-center text-indigo-600">
                        <img className="h-8 w-auto" src="/ScanPlate.png" alt="ScanPlate" />
                        <span className="ml-2 font-semibold text-lg text-gray-800">Admin</span>
                    </Link>
                </div>
                <div className="flex-grow mt-5 flex flex-col">
                    <nav className="flex-1 px-2 pb-4 space-y-1">
                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                // Style based on active status provided by NavLink
                                className={({ isActive }) =>
                                    classNames(
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                                    )
                                }
                            >
                                <item.icon
                                    className={({ isActive }) => classNames(
                                        isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500',
                                        'mr-3 flex-shrink-0 h-5 w-5' // Adjusted size
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                {/* Optional Footer area in sidebar */}
                {/* <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
             <a href="#" className="flex-shrink-0 group block">
                 <div className="flex items-center">
                     <div> <img className="inline-block h-9 w-9 rounded-full" src="placeholder_avatar.png" alt="" /> </div>
                     <div className="ml-3"> <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900"> User Name </p> <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700"> View profile </p> </div>
                 </div>
             </a>
         </div> */}
            </div>
        </div>
    );
};

export default AdminSidebar;
