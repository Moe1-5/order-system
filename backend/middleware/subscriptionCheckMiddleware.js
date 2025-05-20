// middleware/subscriptionCheckMiddleware.js
import User from '../models/user.js'; // Adjust path if needed

const requireActiveSubscription = async (req, res, next) => {
    // This middleware should run AFTER the 'protect' middleware
    if (!req.user?._id) {
        // Should have been caught by 'protect', but good safety check
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        // Fetch the latest status directly from DB in case webhooks were delayed
        // Or rely on req.user if 'protect' fetches fresh data including status
        // Let's assume req.user might be slightly stale and refetch for certainty:
        const user = await User.findById(req.user._id).select('subscriptionStatus');

        if (!user) {
             // Should not happen if protect worked
             return res.status(401).json({ message: 'User not found after authentication.' });
        }

        // Define what counts as "active"
        const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';

        if (!isActive) {
            console.log(`Subscription Check Failed for User ${req.user._id}. Status: ${user.subscriptionStatus}`);
            // Send a specific status code/message the frontend can check
            return res.status(403).json({
                message: 'Active subscription required to access this resource.',
                subscriptionStatus: user.subscriptionStatus, // Send status for context
                code: 'SUBSCRIPTION_INACTIVE' // Add a code for easier frontend handling
            });
        }

        // User has an active subscription, proceed
        console.log(`Subscription Check Passed for User ${req.user._id}. Status: ${user.subscriptionStatus}`);
        next();

    } catch (error) {
        console.error("Error during subscription check:", error);
        return res.status(500).json({ message: "Server error checking subscription status." });
    }
};

export default requireActiveSubscription;
