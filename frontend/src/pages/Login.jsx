import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Make sure this is imported
import { FaGoogle, FaFacebook, FaEye, FaEyeSlash, FaLock, FaEnvelope, FaExclamationCircle } from 'react-icons/fa';
import axiosInstance from '../api/axiosInstance'; // Assuming path is correct

function Login() {
    // State for form data
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    // State for form handling
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'

    const navigate = useNavigate(); // Initialize navigate

    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear errors when typing
        if (errors[name]) {
            setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
        }
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Switch between email and phone login
    const switchLoginMethod = (method) => {
        if (loginMethod !== method) {
            setLoginMethod(method);
            setErrors({});
            // Reset relevant fields based on method
            setFormData({
                email: '',
                password: '',
                phone: '',
                rememberMe: formData.rememberMe // Preserve rememberMe
            });
        }
    };

    // Validate form
    const validateForm = () => {
        let formErrors = {};

        if (loginMethod === 'email') {
            // Email validation
            if (!formData.email.trim()) {
                formErrors.email = "Email is required";
            } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
                formErrors.email = "Please enter a valid email address";
            }
        } else {
            // Phone validation
            if (!formData.phone) {
                formErrors.phone = "Phone number is required";
            } else if (!/^\+?[0-9\s-()]{8,20}$/.test(formData.phone.trim())) {
                formErrors.phone = "Please enter a valid phone number";
            }
        }

        // Password validation
        if (!formData.password) {
            formErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            formErrors.password = "Password must be at least 8 characters";
        }

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); // Clear previous errors

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                console.log("Attempting login with method:", loginMethod);
                console.log("RememberMe status:", formData.rememberMe);

                // Determine the login identifier based on the method
                const loginIdentifier = loginMethod === 'email'
                    ? { email: formData.email }
                    : { phone: formData.phone };

                // Prepare the payload
                const payload = {
                    ...loginIdentifier, // Send email OR phone
                    password: formData.password,
                    rememberMe: formData.rememberMe
                };
                console.log("Submitting Login Payload:", payload);

                // Make the API call
                const response = await axiosInstance.post('/auth/login', payload);

                // Log the entire response data from the backend
                console.log('Login backend response data:', response.data);

                // --- NEW: Handle Different Success Responses ---

                // Case 1: Login OK, but Subscription Inactive/Needed
                if (response.data && response.data.needsSubscription === true) {
                    console.log("Login successful, but subscription needed. Redirecting to billing.");
                    // DO NOT save tokens here.
                    // Optionally display a message briefly, or just redirect immediately.
                    // Consider passing user info if needed by billing page (e.g., via state)
                    // For now, just redirect:
                    navigate('/billing', { replace: true }); // Redirect to your billing page route
                    // Note: Since we redirect, setIsSubmitting(false) in finally might not run visibly, but that's okay.

                }
                // Case 2: Login OK, Subscription Active, Tokens Received
                else if (response.data && response.data.accessToken) {
                    console.log("Login successful with active subscription. Saving tokens.");
                    const tokenToSave = response.data.accessToken;

                    // Validate the received token before saving (basic check)
                    if (typeof tokenToSave === 'string' && tokenToSave.length > 10) {
                        localStorage.setItem('token', tokenToSave); // Use your actual token key name
                        console.log('Access Token SAVED to localStorage.');

                        // Handle optional refresh token
                        if (response.data.refreshToken) {
                            const refreshTokenToSave = response.data.refreshToken;
                            if (typeof refreshTokenToSave === 'string' && refreshTokenToSave.length > 10) {
                                localStorage.setItem('refreshToken', refreshTokenToSave); // Use your actual refresh token key name
                                console.log('Refresh Token SAVED to localStorage.');
                            } else {
                                console.warn('Received invalid refresh token:', refreshTokenToSave);
                            }
                        }

                        // --- IMPORTANT: Update Auth State ---
                        // You likely need to call a function from your AuthContext or Redux store here
                        // to update the global application state that the user is now logged in.
                        // Example (replace with your actual state management call):
                        // authContext.login(response.data.user, response.data.accessToken);

                        console.log("Redirecting to dashboard...");
                        navigate('/dashboard', { replace: true }); // Redirect on successful login and token save

                    } else {
                        // Token received but looks invalid
                        console.error("Received invalid or empty access token from backend during login:", tokenToSave);
                        setErrors({ submit: 'Login successful but received an invalid session token. Please try again.' });
                    }
                }
                // Case 3: Unexpected Success Response (2xx status but no token and no needsSubscription flag)
                else {
                    console.error("Login successful but received an unexpected response structure:", response.data);
                    const errorMsg = response.data?.message || 'Login succeeded but failed to initialize session properly. Please try again.';
                    setErrors({ submit: errorMsg });
                }
                // --- End NEW Logic ---

            } catch (error) {
                // Keep existing detailed error handling
                console.error('Login API call error:', error);
                let errorMsg = 'An unexpected error occurred during login.';
                if (error.response) {
                    console.error("Error Response Data:", error.response.data);
                    console.error("Error Response Status:", error.response.status);
                    // Check if backend sent structured validation errors
                    if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
                        // Display specific validation errors if available
                        // Example: combine messages or display the first one
                        errorMsg = error.response.data.errors.map(err => err.msg).join(' ');
                    } else {
                        errorMsg = error.response.data?.message || error.response.data?.error || `Login failed (Status: ${error.response.status}). Please check your credentials.`;
                    }
                } else if (error.request) {
                    console.error("Error Request Data:", error.request);
                    errorMsg = 'Could not connect to the server. Please check your network.';
                } else {
                    console.error('Error Message:', error.message);
                    errorMsg = `An error occurred: ${error.message}`;
                }
                setErrors({ submit: errorMsg });

            } finally {
                // This will run unless an unhandled error occurs or navigation happens instantly
                // It's generally safe to leave it here.
                setIsSubmitting(false);
            }
        } else {
            console.log("Login form validation failed:", errors);
            // Optional: Scroll to first error (keep existing logic)
            // ...
        }
    };

    // Handle social login
    const handleSocialLogin = async (provider) => {
        setIsSubmitting(true);

        try {
            // Simulate API call to social provider
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log(`Logging in with ${provider}`);

            // In a real app, you would redirect to OAuth provider or use SDK
            // Example: window.location.href = `/api/auth/${provider}`;
            alert(`${provider} login initiated! In a real app, you would be redirected to ${provider}'s login page.`);

            // On successful callback from OAuth provider:
            // 1. Get user info/token from provider
            // 2. Send it to your backend (/api/auth/google/callback or similar)
            // 3. Backend verifies, creates/logs in user, sends back your app's JWT
            // 4. Store JWT, navigate('/dashboard')

        } catch (error) {
            console.error(`${provider} login error:`, error);
            setErrors({ submit: `Failed to login with ${provider}. Please try again.` });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Input class helper
    const getInputClasses = (fieldName) => {
        const baseClasses = "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 bg-white";
        const errorClasses = "border-red-500 focus:ring-red-500";
        const normalClasses = "border-gray-300 focus:ring-orange-500";

        return errors[fieldName]
            ? `${baseClasses} ${errorClasses}`
            : `${baseClasses} ${normalClasses}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-orange-600 tracking-wide cursor-default mb-2">
                        ScanPlate
                    </h1>
                    <h2 className="text-2xl font-semibold text-gray-800">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Sign in to manage your restaurant
                    </p>
                </div>

                {/* Form Container */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="p-8">
                        {/* Social Login Buttons */}
                        <div className="space-y-3 mb-6">
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Google')}
                                disabled={isSubmitting}
                                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 text-gray-700 font-medium transition duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
                                Continue with Google
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Facebook')}
                                disabled={isSubmitting}
                                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 text-gray-700 font-medium transition duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <FaFacebook className="h-5 w-5 text-blue-600 mr-2" />
                                Continue with Facebook
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        {/* Login Method Tabs */}
                        <div className="flex border-b border-gray-200 mb-6">
                            <button
                                type="button"
                                onClick={() => switchLoginMethod('email')}
                                className={`flex-1 py-2 text-center text-sm font-medium focus:outline-none ${loginMethod === 'email'
                                    ? 'text-orange-600 border-b-2 border-orange-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:border-b-2'
                                    }`}
                            >
                                Email
                            </button>
                            <button
                                type="button"
                                onClick={() => switchLoginMethod('phone')}
                                className={`flex-1 py-2 text-center text-sm font-medium focus:outline-none ${loginMethod === 'phone'
                                    ? 'text-orange-600 border-b-2 border-orange-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:border-b-2'
                                    }`}
                            >
                                Phone Number
                            </button>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email or Phone Input */}
                            {loginMethod === 'email' ? (
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaEnvelope className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`${getInputClasses('email')} pl-10`}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <FaExclamationCircle className="mr-1" /> {errors.email}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        {/* Add Phone Icon Maybe? */}
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            autoComplete="tel"
                                            value={formData.phone || ''}
                                            onChange={handleChange}
                                            className={getInputClasses('phone')}
                                            placeholder="+60 12-345 6789"
                                        />
                                    </div>
                                    {errors.phone && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <FaExclamationCircle className="mr-1" /> {errors.phone}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Password Input */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`${getInputClasses('password')} pl-10`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <FaExclamationCircle className="mr-1" /> {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="rememberMe"
                                        name="rememberMe"
                                        type="checkbox"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    {/* TODO: Implement Forgot Password functionality */}
                                    <a href="/forgot-password" className="font-medium text-orange-600 hover:text-orange-500">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            {/* Submit Error Message */}
                            {errors.submit && (
                                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded text-sm flex items-center">
                                    <FaExclamationCircle className="mr-2 flex-shrink-0" />
                                    {errors.submit}
                                </div>
                            )}

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-150 ease-in-out ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : 'Sign in'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a href="/register" className="font-medium text-orange-600 hover:text-orange-500 transition duration-150">
                            Register your restaurant
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
