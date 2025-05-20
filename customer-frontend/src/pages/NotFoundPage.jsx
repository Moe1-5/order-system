import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';

const NotFoundPage = ({ message = "Page Not Found" }) => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <FiAlertCircle className="w-16 h-16 text-orange-400 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">{message}</h1>
        <p className="text-gray-500 mb-6">The link might be incorrect or the page may have moved.</p>
        <Link
            to="/" // Link to a safe default route if applicable
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        > Go Back Home (Example)</Link>
    </div>
);
export default NotFoundPage;
