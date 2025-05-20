// routes/billingRoutes.js
import express from 'express';
import {
    createSubscriptionCheckoutSession,
    createCustomerPortalSession,
    handleWebhook // Import webhook handler
} from '../controllers/billingController.js'; // Use ESM import
import protect from '../middleware/authMiddleware.js'; // Use your protect middleware

const router = express.Router();

// --- Routes Requiring User Authentication ---
// Matches path in server.js prefix /api/payments
router.post('/create-subscription-checkout-session', protect, createSubscriptionCheckoutSession);
router.post('/create-customer-portal-session', protect, createCustomerPortalSession);

// --- Stripe Webhook Route ---
// This route does NOT use the protect middleware. Stripe sends requests here directly.
// The path matches the path used for the express.raw middleware in server.js
router.post('/stripe-webhooks', handleWebhook);

export default router; // Use ESM export
