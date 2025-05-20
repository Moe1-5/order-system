// src/pages/BillingPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { FiCheckCircle, FiXCircle, FiLoader, FiExternalLink, FiCreditCard, FiAlertTriangle } from 'react-icons/fi';
// --- IMPORT YOUR AXIOS INSTANCE ---
// Adjust the path based on your project structure
import axiosInstance from '../api/axiosInstance'; // e.g., if axiosInstance is in src/api/

// --- LOAD STRIPE ---
// Make sure VITE_STRIPE_PUBLISHABLE_KEY is defined in your frontend .env file
// Use REACT_APP_ prefix if using Create React App
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    console.error("ERROR: VITE_STRIPE_PUBLISHABLE_KEY is not set in the frontend environment variables.");
    // You might want to display an error message to the user here instead of rendering the page
}


// --- HELPER FUNCTION ---
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Stripe timestamps are in seconds, JS Date needs milliseconds
    try {
        return new Date(timestamp * 1000).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Invalid Date';
    }
};

// --- COMPONENT DEFINITION ---
function BillingPage() {
    // --- STATE HOOKS ---
    const [subscriptionStatus, setSubscriptionStatus] = useState(null); // Holds status from backend
    const [isLoadingStatus, setIsLoadingStatus] = useState(true); // Loading state for initial fetch
    const [isProcessingAction, setIsProcessingAction] = useState(false); // Loading state for button clicks
    const [error, setError] = useState(''); // Stores error messages
    const [feedbackMessage, setFeedbackMessage] = useState(''); // Stores success/cancel messages from Stripe redirect

    // --- ROUTER HOOKS ---
    const location = useLocation(); // Access query parameters like ?success=true
    const navigate = useNavigate(); // Programmatically navigate

    // --- EFFECT: Fetch Subscription Status on Mount ---
    useEffect(() => {
        const fetchSubscriptionStatus = async () => {
            setIsLoadingStatus(true);
            setError('');
            // Axios interceptor should handle adding the Authorization token

            try {
                // Make GET request using axiosInstance
                // Path is relative to baseURL defined in axiosInstance (e.g., 'http://localhost:5000/api')
                // Route: GET /api/auth/subscription-status
                const response = await axiosInstance.get('/auth/subscription-status');

                setSubscriptionStatus(response.data); // Axios puts response data in `data` property

            } catch (err) {
                console.error("BillingPage - Failed to fetch subscription status:", err);
                const message = err.response?.data?.message || err.message || 'Unknown error fetching status';
                const status = err.response?.status;

                if (status === 401 || status === 403) {
                    // Handle authentication errors specifically
                    setError(`Authentication failed: ${message}. Please log in again.`);
                    // Optional: Clear token and redirect to login
                    // localStorage.removeItem('accessToken'); // Or your token key
                    // navigate('/login', { replace: true });
                } else {
                    setError(`Failed to load subscription details: ${message}`);
                }
                setSubscriptionStatus(null); // Reset status on error
            } finally {
                setIsLoadingStatus(false);
            }
        };

        fetchSubscriptionStatus();
        // Intentionally omitting navigate from dependencies unless used inside fetch logic
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty array ensures this runs only once when the component mounts

    // --- EFFECT: Handle Feedback from Stripe Redirects ---
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        let message = '';
        let isSuccess = false;

        if (queryParams.get('success')) {
            message = 'Subscription successful! Welcome aboard.';
            isSuccess = true;
        } else if (queryParams.get('canceled')) {
            message = 'Subscription process was canceled. You can try again anytime.';
        }

        if (message) {
            setFeedbackMessage(message);
            // Clean the URL by removing query parameters after reading them
            navigate(location.pathname, { replace: true });

            // Optional: Redirect after successful subscription
            if (isSuccess) {
                // navigate('/dashboard'); // Example: Redirect to dashboard after success
            }
        }

        // Clear the feedback message after a few seconds if it was set
        if (message) {
            const timer = setTimeout(() => setFeedbackMessage(''), 6000); // Increased duration
            // Cleanup function to clear timer if component unmounts
            return () => clearTimeout(timer);
        }

    }, [location.search, location.pathname, navigate]); // Rerun if search params or navigate function changes


    // --- ACTION HANDLER: Start Subscription ---
    const handleSubscribe = async () => {
        setIsProcessingAction(true);
        setError('');
        setFeedbackMessage('');
        // Axios interceptor adds the token

        try {
            // Make POST request using axiosInstance
            // Route: POST /api/payments/create-subscription-checkout-session
            const response = await axiosInstance.post('/payments/create-subscription-checkout-session');
            const session = response.data;

            if (!session || !session.id) {
                throw new Error('Invalid session data received from server.');
            }

            // Redirect to Stripe Checkout page
            const stripe = await stripePromise;
            if (!stripe) {
                throw new Error("Stripe.js failed to load.");
            }
            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: session.id });

            // This point is only reached if redirectToCheckout fails client-side
            if (stripeError) {
                throw new Error(`Stripe Error: ${stripeError.message}`);
            }

        } catch (err) {
            console.error("BillingPage - Subscription failed:", err);
            const message = err.response?.data?.message || err.message || 'Could not start subscription.';
            setError(message);
            setIsProcessingAction(false); // Stop loading only if API/Stripe call fails before redirect
        }
        // If redirect is successful, the page navigates away, no need to set loading false here
    };

    // --- ACTION HANDLER: Manage Existing Subscription ---
    const handleManageBilling = async () => {
        setIsProcessingAction(true);
        setError('');
        setFeedbackMessage('');
        // Axios interceptor adds the token

        try {
            // Make POST request using axiosInstance
            // Route: POST /api/payments/create-customer-portal-session
            const response = await axiosInstance.post('/payments/create-customer-portal-session');
            const portalSession = response.data;

            if (!portalSession || !portalSession.url) {
                throw new Error('Invalid portal session data received from server.');
            }

            // Redirect user to the Stripe Customer Portal URL provided by backend
            window.location.href = portalSession.url;
            // Page navigates away, no need to set loading false here

        } catch (err) {
            console.error("BillingPage - Manage billing failed:", err);
            const message = err.response?.data?.message || err.message || 'Could not open billing portal.';
            setError(message);
            setIsProcessingAction(false); // Stop loading only if API call fails before redirect
        }
    };

    // --- RENDER HELPER: Display Subscription Status and Buttons ---
    const renderSubscriptionStatus = () => {
        // Show loading spinner while fetching initial status
        if (isLoadingStatus) {
            return (
                <div className="flex items-center justify-center text-gray-500 py-10">
                    <FiLoader className="animate-spin mr-3 text-xl" /> Loading subscription status...
                </div>
            );
        }

        // Determine if user should see the 'Subscribe' button
        const showSubscribeButton = !subscriptionStatus?.status ||
            subscriptionStatus.status === 'incomplete' ||
            subscriptionStatus.status === 'canceled'; // Show subscribe even if canceled

        // Render "No Subscription" state or "Canceled" state
        if (showSubscribeButton) {
            const title = subscriptionStatus?.status === 'canceled' ? 'Subscription Canceled' : 'No Active Subscription';
            const description = subscriptionStatus?.status === 'canceled' ? `Access ended or ends ${formatDate(subscriptionStatus.currentPeriodEnd)}.` : 'Subscribe to unlock premium features!';

            return (
                <div className="text-center p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                    <FiAlertTriangle className="text-blue-500 text-4xl mx-auto mb-3" />
                    <p className="text-xl font-semibold text-blue-800 mb-2">{title}</p>
                    <p className="text-base text-blue-700 mb-5">{description}</p>
                    <button
                        onClick={handleSubscribe}
                        disabled={isProcessingAction}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg inline-flex items-center justify-center transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        {isProcessingAction ? <FiLoader className="animate-spin mr-2" /> : <FiCreditCard className="mr-2" />}
                        {isProcessingAction ? 'Processing...' : 'Subscribe Now'}
                    </button>
                </div>
            );
        }

        // --- Render Active, Trialing, Past Due States ---
        let statusColorClass = 'text-gray-700 bg-gray-100';
        let StatusIconComponent = FiAlertTriangle;
        let statusIconColor = 'text-gray-500';
        let statusText = `Status: ${subscriptionStatus.status}`; // Default text

        switch (subscriptionStatus.status) {
            case 'active':
                statusColorClass = 'text-green-800 bg-green-100';
                StatusIconComponent = FiCheckCircle;
                statusIconColor = 'text-green-600';
                statusText = `Active until ${formatDate(subscriptionStatus.currentPeriodEnd)}`;
                break;
            case 'trialing':
                statusColorClass = 'text-sky-800 bg-sky-100';
                StatusIconComponent = FiCheckCircle;
                statusIconColor = 'text-sky-600';
                statusText = `Trial active until ${formatDate(subscriptionStatus.currentPeriodEnd)}`;
                break;
            case 'past_due':
            case 'unpaid':
                statusColorClass = 'text-orange-800 bg-orange-100';
                StatusIconComponent = FiAlertTriangle;
                statusIconColor = 'text-orange-600';
                statusText = 'Payment Issue - Update Payment Method';
                break;
            // 'canceled' and 'incomplete' are handled by the block above
            default:
                // Keep default styles for unexpected statuses
                break;
        }

        return (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Current Plan: {subscriptionStatus.planName || 'Standard Plan'} {/* TODO: Get Plan Name if needed */}
                </h3>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-5 ${statusColorClass}`}>
                    <StatusIconComponent className={`mr-1.5 h-4 w-4 ${statusIconColor}`} />
                    {statusText}
                </div>
                <p className="text-base text-gray-600 mb-5">
                    Use the portal to manage your subscription details, update payment methods, and view past invoices.
                </p>
                <button
                    onClick={handleManageBilling}
                    disabled={isProcessingAction}
                    className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-lg inline-flex items-center justify-center transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    {isProcessingAction ? <FiLoader className="animate-spin mr-2" /> : <FiExternalLink className="mr-2" />}
                    {isProcessingAction ? 'Processing...' : 'Manage Billing'}
                </button>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        // Consider adding padding or margin to the container if it's nested
        <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12"> {/* Adjusted max-width and padding */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 md:mb-8 text-center md:text-left">
                Billing & Subscription
            </h1>

            {/* Feedback Messages Area */}
            {feedbackMessage && (
                <div
                    className={`mb-6 p-4 rounded-lg text-base border ${feedbackMessage.includes('canceled')
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                        : 'bg-green-50 border-green-300 text-green-800'
                        }`}
                    role="alert"
                >
                    {feedbackMessage}
                </div>
            )}

            {/* Error Display Area */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800 text-base flex items-start" role="alert">
                    <FiXCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Subscription Status and Actions Card/Section */}
            <div className="mt-4">
                {renderSubscriptionStatus()}
            </div>

            {/* Footer Text/Explanation */}
            <p className="text-sm text-gray-500 mt-6 text-center">
                Clicking "Manage Billing" securely redirects you to Stripe.
            </p>
        </div>
    );
}

export default BillingPage;
