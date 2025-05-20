import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ErrorMessage = ({ message = "An unexpected error occurred.", onRetry }) => (
    <div className="flex flex-col items-center justify-center p-4 text-center text-red-700">
        <FiAlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        <p className="font-medium mb-3">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="px-3 py-1 border border-red-600 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Retry
            </button>
        )}
    </div>
);
export default ErrorMessage;
