import React from 'react';
import { FiLoader } from 'react-icons/fi';

const LoadingSpinner = ({ message = "Loading..." }) => (
    <div className="flex flex-col items-center justify-center p-4 text-center">
        <FiLoader className="animate-spin h-8 w-8 text-indigo-600 mb-2" />
        <span className="text-sm text-gray-600">{message}</span>
    </div>
);
export default LoadingSpinner;
