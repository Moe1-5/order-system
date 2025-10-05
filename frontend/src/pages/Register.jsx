// src/pages/Register.jsx

import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import axiosInstance from '../api/axiosInstance'; // Adjust path if needed

function Register() {
    // --- State ---
    const [formData, setFormData] = useState({
        restaurantName: '',
        contactName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '', // Address starts empty
        agreeToTerms: false
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const navigate = useNavigate(); // Hook for navigation

    // --- Effects ---
    // Update password strength whenever password changes
    useEffect(() => {
        if (formData.password) {
            const strength = calculatePasswordStrength(formData.password);
            setPasswordStrength(strength);
        } else {
            // Reset strength if password is empty
            setPasswordStrength({
                score: 0,
                hasMinLength: false,
                hasUpperCase: false,
                hasLowerCase: false,
                hasNumber: false,
                hasSpecialChar: false
            });
        }
    }, [formData.password]);

    // --- Helper Functions ---

    // Calculate password strength
    const calculatePasswordStrength = (password) => {
        let score = 0;
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[^A-Za-z0-9]/.test(password); // Matches any non-alphanumeric character

        if (hasMinLength) score++;
        if (hasUpperCase) score++;
        if (hasLowerCase) score++;
        if (hasNumber) score++;
        if (hasSpecialChar) score++;

        return { score, hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar };
    };

    // Handle input changes and update state
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Update form data based on input type
        setFormData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear related error when user types in a field
        if (errors[name]) {
            setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
        }
        // Clear general submit error when user types
        if (errors.submit) {
            setErrors(prevErrors => ({ ...prevErrors, submit: null }));
        }
        // Clear confirm password error if password is changed
        if (name === 'password' && errors.confirmPassword) {
            setErrors(prevErrors => ({ ...prevErrors, confirmPassword: null }));
        }
    };

    // Validate the form before submission
    const validateForm = () => {
        let formErrors = {};

        if (!formData.restaurantName.trim()) formErrors.restaurantName = "Restaurant name is required";
        if (!formData.contactName.trim()) formErrors.contactName = "Contact person name is required";

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!formData.email.trim()) {
            formErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email.trim())) {
            formErrors.email = "Please enter a valid email address";
        }

        // Phone is now required
        if (!formData.phone.trim()) {
            formErrors.phone = "Phone number is required";
        } else if (!/^\+?[0-9\s-()]{8,20}$/.test(formData.phone.trim())) {
            // Simple regex for basic validation, adjust if stricter rules needed
            formErrors.phone = "Please enter a valid phone number format";
        }

        // Address is now required
        if (!formData.address.trim()) {
            formErrors.address = "Restaurant address is required";
        }

        // Password validation
        if (!formData.password) {
            formErrors.password = "Password is required";
        } else if (passwordStrength.score < 3) { // Check strength score
            formErrors.password = "Password isn't strong enough (needs uppercase, lowercase, number, special char, min 8 chars)";
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            formErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
            formErrors.confirmPassword = "Passwords do not match";
        }

        // Terms agreement validation
        if (!formData.agreeToTerms) {
            formErrors.agreeToTerms = "You must agree to the terms and conditions";
        }

        setErrors(formErrors);
        console.log("Validation Results:", formErrors); // Log validation errors
        return Object.keys(formErrors).length === 0; // Return true if no errors
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); // Clear previous errors

        if (validateForm()) {
            setIsSubmitting(true);

            try {
                // Prepare payload matching backend expectations (as modified previously)
                const payload = {
                    restaurantName: formData.restaurantName,
                    contactName: formData.contactName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,     // Required
                    address: formData.address,   // Required
                    agreeToTerms: formData.agreeToTerms // Required
                };
                console.log("Submitting Registration Payload:", payload);

                // Make the API call
                const response = await axiosInstance.post('/auth/register', payload);

                // Log the entire response data from the backend
                console.log('Registration successful response data:', response.data);

                // --- Token Handling ---
                if (response.data && response.data.accessToken) {
                    const tokenToSave = response.data.accessToken;
                    console.log('Attempting to save token:', tokenToSave);

                    // Validate the received token before saving
                    if (typeof tokenToSave === 'string' && tokenToSave.length > 10) { // Basic check
                        localStorage.setItem('token', tokenToSave);
                        console.log('Access Token SAVED to localStorage.');

                        // Optional: Handle refresh token if backend sends it on register
                        if (response.data.refreshToken) {
                            const refreshTokenToSave = response.data.refreshToken;
                            if (typeof refreshTokenToSave === 'string' && refreshTokenToSave.length > 10) {
                                localStorage.setItem('refreshToken', refreshTokenToSave);
                                console.log('Refresh Token SAVED to localStorage.');
                            } else {
                                console.warn('Received invalid refresh token during registration:', refreshTokenToSave);
                            }
                        }

                        setSubmitSuccess(true); // Set success state for message display
                        setTimeout(() => {
                            navigate('/login'); // Redirect after delay
                        }, 1500);

                    } else {
                        // Token received but looks invalid
                        console.error("Received invalid or empty access token from backend during registration:", tokenToSave);
                        setErrors({ submit: 'Registration successful but received an invalid session token.' });
                        setSubmitSuccess(false);
                    }
                } else {
                    // Backend response indicates success (status 2xx) but no token provided
                    console.error("Registration successful but no accessToken found in response:", response.data);
                    // Use backend message if available, otherwise generic
                    const errorMsg = response.data?.message || 'Registration succeeded but failed to initialize session. Please log in manually.';
                    setErrors({ submit: errorMsg });
                    setSubmitSuccess(false);
                }
                // --- End Token Handling ---

            } catch (error) {
                console.error('Registration API call error:', error);
                let errorMsg = 'An unexpected error occurred during registration.';
                if (error.response) {
                    // Server responded with an error status (4xx, 5xx)
                    console.error("Error Response Data:", error.response.data);
                    console.error("Error Response Status:", error.response.status);
                    errorMsg = error.response.data.message || error.response.data.error || `Registration failed (Status: ${error.response.status}). Please check your input.`;
                } else if (error.request) {
                    // Request made but no response received
                    console.error("Error Request Data:", error.request);
                    errorMsg = 'Could not connect to the server. Please check your network.';
                } else {
                    // Setup error
                    console.error('Error Message:', error.message);
                    errorMsg = `An error occurred: ${error.message}`;
                }
                setErrors({ submit: errorMsg });
                setSubmitSuccess(false);

            } finally {
                setIsSubmitting(false);
            }
        } else {
            console.log("Registration form validation failed:", errors);
            // Scroll to first error
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField && firstErrorField !== 'submit') {
                const element = document.getElementById(firstErrorField);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    };
    // Helper function to get input classes based on validation errors
    const getInputClasses = (fieldName) => {
        const baseClasses = "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 bg-white";
        const errorClasses = "border-red-500 focus:ring-red-500";
        const successClasses = "border-green-500 focus:ring-green-500"; // Applied on specific conditions
        const normalClasses = "border-gray-300 focus:ring-orange-500";

        // Show success border for strong password
        if (fieldName === 'password' && !errors.password && passwordStrength.score >= 3 && formData.password) {
            return `${baseClasses} ${successClasses}`;
        }
        // Show success border for matching confirm password
        if (fieldName === 'confirmPassword' && !errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword) {
            return `${baseClasses} ${successClasses}`;
        }
        // Show error border if there's an error for this field
        if (errors[fieldName]) {
            return `${baseClasses} ${errorClasses}`;
        }
        // Default border
        return `${baseClasses} ${normalClasses}`;
    };

    // Render password strength indicator UI
    const renderPasswordStrength = () => {
        const { score, hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar } = passwordStrength;
        let color = "bg-gray-200";
        let strengthText = "Weak"; // Default to weak if has password but low score

        if (formData.password.length === 0) {
            strengthText = "Not set";
        } else if (score <= 2) {
            color = "bg-red-500";
        } else if (score <= 3) {
            color = "bg-yellow-500";
            strengthText = "Moderate";
        } else {
            color = "bg-green-500";
            strengthText = "Strong";
        }

        const Requirement = ({ met, text }) => (
            <li className="text-xs flex items-center">
                {met ? <FaCheck className="mr-1.5 text-green-500 flex-shrink-0" /> : <FaTimes className="mr-1.5 text-red-500 flex-shrink-0" />}
                {text}
            </li>
        );

        return (
            <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">Password strength:</span>
                    <span className={`text-xs font-medium ${score <= 2 ? 'text-red-600' : score <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>{strengthText}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${(score / 5) * 100}%` }}></div>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                    <Requirement met={hasMinLength} text="At least 8 characters" />
                    <Requirement met={hasUpperCase} text="Uppercase letter" />
                    <Requirement met={hasLowerCase} text="Lowercase letter" />
                    <Requirement met={hasNumber} text="Number" />
                    <Requirement met={hasSpecialChar} text="Special character" />
                </ul>
            </div>
        );
    };

    // Toggle password visibility state
    const togglePasswordVisibility = (field) => {
        if (field === 'password') {
            setShowPassword(!showPassword);
        } else if (field === 'confirmPassword') {
            setShowConfirmPassword(!showConfirmPassword);
        }
    };

    // --- JSX Return ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-xl w-full mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-orange-600 tracking-wide cursor-default mb-2">
                        ScanPlate
                    </h1>
                    <h2 className="text-2xl font-semibold text-gray-800">
                        Restaurant Registration
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Create your account to start managing your digital menu
                    </p>
                </div>

                {/* Success Message */}
                {submitSuccess && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-6 flex items-center shadow" role="alert">
                        <FaCheck className="mr-3 flex-shrink-0" />
                        <div>
                            <p className="font-bold">Registration Successful!</p>
                            <p className="text-sm">Redirecting you to the subscription...</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form className="bg-white shadow-xl rounded-lg overflow-hidden" onSubmit={handleSubmit} noValidate>
                    {/* Added noValidate to prevent default browser validation, relying on ours */}
                    <div className="p-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-6 border-b pb-3">Business Information</h3>
                        <div className="space-y-6">
                            {/* Restaurant Name */}
                            <div>
                                <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name <span className="text-red-500">*</span></label>
                                <input type="text" id="restaurantName" name="restaurantName" value={formData.restaurantName} onChange={handleChange} className={getInputClasses('restaurantName')} placeholder="E.g., Delicious Bites Cafe" required />
                                {errors.restaurantName && (<p className="mt-1 text-xs text-red-600">{errors.restaurantName}</p>)}
                            </div>
                            {/* Contact Person Name */}
                            <div>
                                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name <span className="text-red-500">*</span></label>
                                <input type="text" id="contactName" name="contactName" value={formData.contactName} onChange={handleChange} className={getInputClasses('contactName')} placeholder="E.g., Alex Chen" required />
                                {errors.contactName && (<p className="mt-1 text-xs text-red-600">{errors.contactName}</p>)}
                            </div>
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                <input type="email" id="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} className={getInputClasses('email')} placeholder="you@example.com" required />
                                {errors.email && (<p className="mt-1 text-xs text-red-600">{errors.email}</p>)}
                            </div>
                            {/* Phone Number */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                <input type="tel" id="phone" name="phone" autoComplete="tel" value={formData.phone} onChange={handleChange} className={getInputClasses('phone')} placeholder="+60 12-345 6789" required />
                                {errors.phone && (<p className="mt-1 text-xs text-red-600">{errors.phone}</p>)}
                            </div>
                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Restaurant Address <span className="text-red-500">*</span></label>
                                <textarea id="address" name="address" rows={3} value={formData.address} onChange={handleChange} className={`${getInputClasses('address')} resize-none`} placeholder="123 Jalan Makan, 50000 Kuala Lumpur" required />
                                {errors.address && (<p className="mt-1 text-xs text-red-600">{errors.address}</p>)}
                            </div>
                        </div>

                        <hr className="my-8 border-gray-200" />

                        <h3 className="text-lg font-medium text-gray-900 mb-6 border-b pb-3">Account Security</h3>
                        <div className="space-y-6">
                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} id="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} className={getInputClasses('password')} placeholder="Create a strong password" required />
                                    <button type="button" aria-label="Toggle password visibility" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none" onClick={() => togglePasswordVisibility('password')}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                                {errors.password && (<p className="mt-1 text-xs text-red-600">{errors.password}</p>)}
                                {formData.password && renderPasswordStrength()}
                            </div>
                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} className={getInputClasses('confirmPassword')} placeholder="Re-enter password" required />
                                    <button type="button" aria-label="Toggle confirmation password visibility" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none" onClick={() => togglePasswordVisibility('confirmPassword')}>
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (<p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>)}
                            </div>
                            {/* Terms and Conditions */}
                            <div className="flex items-start pt-2">
                                <div className="flex items-center h-5">
                                    <input id="agreeToTerms" name="agreeToTerms" type="checkbox" checked={formData.agreeToTerms} onChange={handleChange} className={`h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 ${errors.agreeToTerms ? 'border-red-500' : ''}`} required />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="agreeToTerms" className="text-gray-700">
                                        I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-orange-600 hover:underline">Terms and Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-orange-600 hover:underline">Privacy Policy</a> <span className="text-red-500">*</span>
                                    </label>
                                    {errors.agreeToTerms && (<p className="mt-1 text-xs text-red-600">{errors.agreeToTerms}</p>)}
                                </div>
                            </div>
                        </div>

                        {/* Submit error message */}
                        {errors.submit && (
                            <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm" role="alert">
                                {errors.submit}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="mt-8 pt-5 border-t border-gray-200">
                            <button type="submit" disabled={isSubmitting || submitSuccess} // Disable after success too
                                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg shadow-sm text-white transition duration-150 ease-in-out ${isSubmitting || submitSuccess ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : 'Create Restaurant Account'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Sign In Link */}
                <div className="text-center mt-6">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500 transition duration-150">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;
