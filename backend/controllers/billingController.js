// controllers/billingController.js
import stripePackage from 'stripe'; // Use import syntax
import User from '../models/user.js'; // Import your User model
import dotenv from 'dotenv';

dotenv.config();

// Ensure Stripe is initialized correctly
if (!process.env.STRIPE_SECRET_KEY) {
    console.error("FATAL ERROR: STRIPE_SECRET_KEY is not defined.");
    process.exit(1);
}
const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);

const YOUR_DOMAIN = process.env.ADMIN_URL;
const PRICE_ID = process.env.STRIPE_DEFAULT_PRICE_ID; // Make sure this is in your .env
const ADMIN_URL = process.env.ADMIN_URL;

if (!PRICE_ID) {
    console.warn("WARNING: STRIPE_DEFAULT_PRICE_ID is not defined in .env. Subscription creation will fail.");
}
if (!YOUR_DOMAIN) {
    console.warn("WARNING: CLIENT_URL is not defined in .env. Stripe redirects might fail.");
}


// --- Get Current Subscription Status ---
export const getSubscriptionStatus = async (req, res) => {
    try {
        // req.user is attached by protect middleware
        if (!req.user?._id) {
            return res.status(401).json({ message: 'Authentication required (user not found on request)' });
        }

        // Fetch only necessary fields for status check
        const user = await User.findById(req.user._id).select(
            'subscriptionStatus stripePriceId currentPeriodEnd'
        );

        if (!user) {
            return res.status(404).json({ message: 'User profile not found' });
        }

        res.status(200).json({
            status: user.subscriptionStatus,
            planId: user.stripePriceId,
            currentPeriodEnd: user.currentPeriodEnd,
            // Add planName lookup here if needed
        });

    } catch (error) {
        console.error('Error fetching subscription status:', error);
        res.status(500).json({ message: 'Failed to get subscription status', error: error.message });
    }
};

// --- Create Stripe Checkout Session for NEW Subscription ---
export const createSubscriptionCheckoutSession = async (req, res) => {
    // ... (get userId, userEmail, userName, find/create stripeCustomerId as before) ...
    const userId = req.user._id;
    const userEmail = req.user.mail;
    const userName = req.user.userName;

    try {
        let user = await User.findById(userId);
        if (!user) { /* handle error */ }
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            console.log(`Creating Stripe Customer for admin ${userId}`);
            const customer = await stripe.customers.create({ email: userEmail, name: userName, metadata: { scanplateUserId: userId.toString() } });
            stripeCustomerId = customer.id;
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        } else {
            console.log(`Using existing Stripe Customer ${stripeCustomerId} for admin ${userId}`);
        }


        console.log(`Creating Checkout Session for Customer: ${stripeCustomerId}, Price ID: ${PRICE_ID}`);

        if (!ADMIN_URL) { // Add a check
            console.error("ADMIN_URL is not defined in environment variables. Redirects will fail.");
            return res.status(500).json({ message: 'Server configuration error: Missing ADMIN_URL' });
        }


        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [{ price: PRICE_ID, quantity: 1 }],
            // --- Use ADMIN_URL for redirects ---
            success_url: `${ADMIN_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`, // <<< CORRECTED
            cancel_url: `${ADMIN_URL}/billing?canceled=true`,                             // <<< CORRECTED
            // --- End Redirect Change ---
            metadata: {
                scanplateUserId: userId.toString()
            }
        });

        res.status(200).json({ id: session.id });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Checkout session creation failed', error: error.message });
    }
};
// --- Create Stripe Customer Portal Session ---
export const createCustomerPortalSession = async (req, res) => {
    // req.user is attached by protect middleware
    if (!req.user?._id) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const userId = req.user._id;

    try {
        const user = await User.findById(userId).select('stripeCustomerId');
        if (!user || !user.stripeCustomerId) { /* handle error */ }

        if (!ADMIN_URL) { // Add a check
            console.error("ADMIN_URL is not defined in environment variables. Portal redirect will fail.");
            return res.status(500).json({ message: 'Server configuration error: Missing ADMIN_URL' });
        }


        console.log(`Creating Customer Portal Session for Customer: ${user.stripeCustomerId}`);
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${ADMIN_URL}/billing`, // <<< CORRECTED return URL
        });

        res.status(200).json({ url: portalSession.url });

    } catch (error) {
        console.error('Error creating customer portal session:', error);
        res.status(500).json({ message: 'Customer portal session creation failed', error: error.message });
    }
};

// --- Handle Stripe Webhook Events ---
export const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("FATAL ERROR: STRIPE_WEBHOOK_SECRET is not defined.");
        return res.status(500).send('Webhook secret not configured.');
    }

    let event;

    try {
        // req.body should be the raw buffer due to middleware config in server.js
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`❌ Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Successfully constructed event
    console.log('✅ Stripe Webhook Received:', event.type);
    const dataObject = event.data.object;

    // Find user associated with the event
    let user;
    const customerId = dataObject.customer;
    const userIdFromMetadata = dataObject.metadata?.scanplateUserId || (dataObject.client_reference_id); // Check metadata first, maybe client_ref on checkout

    if (customerId) {
        user = await User.findOne({ stripeCustomerId: customerId });
    }
    // Fallback: if user not found by customerId, try metadata (useful for checkout.session.completed before customer is saved reliably)
    if (!user && userIdFromMetadata) {
        console.log(`Webhook: User not found by customer ID ${customerId}, attempting lookup via metadata ID ${userIdFromMetadata}`);
        user = await User.findById(userIdFromMetadata);
        // If we found the user via metadata and they don't have the customerId yet, save it
        if (user && !user.stripeCustomerId && customerId) {
            console.log(`Webhook: Linking user ${user._id} to Stripe Customer ${customerId}`);
            user.stripeCustomerId = customerId;
            // Don't await save here, let the event handler logic do it if needed
        }
    }


    if (!user && event.type !== 'customer.created' && event.type !== 'ping' && event.type !== 'payment_intent.succeeded') {
        console.warn(`Webhook Warning: User not found for customer ${customerId} or metadata ID ${userIdFromMetadata}. Event: ${event.type}`);
        return res.status(200).json({ received: true, message: 'User not found locally, event acknowledged.' });
    }

    // Handle the specific event types
    try { // Wrap specific handling in try/catch
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = dataObject;
                const subscriptionId = session.subscription;
                const stripeCustomerId = session.customer; // Get customer ID from session

                if (!user && session.metadata?.scanplateUserId) { // Double check user found
                    user = await User.findById(session.metadata.scanplateUserId);
                    if (user && !user.stripeCustomerId && stripeCustomerId) {
                        user.stripeCustomerId = stripeCustomerId; // Ensure linkage
                    }
                }

                if (!user) {
                    console.error(`Webhook CRITICAL: User not found for checkout.session.completed even after checks. Metadata AdminID: ${session.metadata?.scanplateUserId}, Customer: ${stripeCustomerId}`);
                    break; // Break switch, let 200 response send
                }

                console.log(`Webhook Action: checkout.session.completed for User ${user._id}. Sub ID: ${subscriptionId}`);

                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                user.stripeSubscriptionId = subscription.id;
                user.stripePriceId = subscription.items.data[0]?.price.id;
                user.subscriptionStatus = subscription.status;
                user.currentPeriodEnd = subscription.current_period_end;
                await user.save();
                console.log(`Webhook Success: User ${user._id} subscription (${user.stripeSubscriptionId}) set to ${user.subscriptionStatus}`);
                break;
            }
            case 'invoice.paid': {
                const invoice = dataObject;
                console.log(`Webhook Action: invoice.paid for Customer ${invoice.customer}.`);
                if (user) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                    user.subscriptionStatus = subscription.status;
                    user.currentPeriodEnd = subscription.current_period_end;
                    user.stripePriceId = subscription.items.data[0]?.price.id;
                    await user.save();
                    console.log(`Webhook Success: User ${user._id} subscription period end updated.`);
                } else {
                    console.warn(`Webhook Warning: invoice.paid received, but user not found for customer ${invoice.customer}.`);
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = dataObject;
                console.log(`Webhook Action: invoice.payment_failed for Customer ${invoice.customer}.`);
                if (user) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                    user.subscriptionStatus = subscription.status; // Update status (e.g., 'past_due')
                    await user.save();
                    // TODO: Consider sending email notification to user
                    console.log(`Webhook Success: User ${user._id} status updated to ${user.subscriptionStatus} due to failed payment.`);
                } else {
                    console.warn(`Webhook Warning: invoice.payment_failed received, but user not found for customer ${invoice.customer}.`);
                }
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = dataObject;
                console.log(`Webhook Action: customer.subscription.updated for Customer ${subscription.customer}. Status: ${subscription.status}`);
                if (user) {
                    user.stripeSubscriptionId = subscription.id; // Ensure ID is current
                    user.stripePriceId = subscription.items.data[0]?.price.id;
                    user.subscriptionStatus = subscription.status;
                    user.currentPeriodEnd = subscription.current_period_end;
                    await user.save();
                    console.log(`Webhook Success: User ${user._id} subscription status updated to ${user.subscriptionStatus}.`);
                } else {
                    console.warn(`Webhook Warning: customer.subscription.updated received, but user not found for customer ${subscription.customer}.`);
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = dataObject;
                console.log(`Webhook Action: customer.subscription.deleted for Customer ${subscription.customer}.`);
                if (user) {
                    user.subscriptionStatus = 'canceled'; // Set final status explicitly
                    user.stripeSubscriptionId = null;
                    user.stripePriceId = null;
                    user.currentPeriodEnd = null; // Can keep if you want to show when access expired
                    await user.save();
                    console.log(`Webhook Success: User ${user._id} subscription marked as canceled.`);
                } else {
                    console.warn(`Webhook Warning: customer.subscription.deleted received, but user not found for customer ${subscription.customer}.`);
                }
                break;
            }
            // Add other cases as needed...
            default:
                console.log(`Webhook Info: Unhandled event type ${event.type}`);
        }
    } catch (handlerError) {
        console.error(`Webhook Handler Error processing event ${event.type}:`, handlerError);
        // Still return 200 to Stripe unless it's a critical signature error
        // You might want specific logic here, e.g., return 500 for certain errors
        // to signal Stripe to retry, but be cautious of infinite retries.
    }

    // Return a 200 response to acknowledge receipt
    res.status(200).json({ received: true });
};
