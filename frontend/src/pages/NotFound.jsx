// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';

const NotFoundComponent = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
            <FiAlertTriangle className="text-yellow-500 h-16 w-16 mb-4" />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">404 - Page Not Found</h1>
            <p className="text-lg text-gray-600 mb-6">
                Oops! The page you are looking for does not exist or has been moved.
            </p>
            <Link
                to="/dashboard" // Link back to the dashboard (adjust if needed)
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-150 ease-in-out text-sm font-medium"
            >
                Go to Dashboard
            </Link>
        </div>
    );
};



export default NotFoundComponent;
