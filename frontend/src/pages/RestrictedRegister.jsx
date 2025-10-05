// src/pages/RestrictedRegister.jsx
import React, { useState } from 'react';
import Register from './Register';
import axiosInstance from '../api/axiosInstance';

const RestrictedRegister = () => {
    const [authorized, setAuthorized] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    // Optional: state for handling form errors more gracefully than an alert
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(''); // Clear previous errors
        try {
            const res = await axiosInstance.post('/admin-access', { username, password });
            if (res.data.accessGranted) {
                setAuthorized(true);
            } else {
                setError('Invalid username or password. Access Denied.');
                // alert('Access Denied'); // Replaced with inline error message
            }
        } catch (err) {
            setError('An error occurred during verification. Please try again.');
            // alert('Access Denied'); // Replaced with inline error message
            console.error('Verification failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (authorized) {
        return <Register />;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">
                    Restricted Access
                </h2>
                <p className="text-center text-gray-600">
                    Admin verification required to proceed.
                </p>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label
                            htmlFor="username"
                            className="text-sm font-bold text-gray-600 block"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full p-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="text-sm font-bold text-gray-600 block"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RestrictedRegister;
