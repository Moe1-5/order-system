// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from 'express-validator'; // Import express-validator
import User from "../models/user.js";
import RestaurantProfile from "../models/RestaurantProfile.js";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "12h";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
    process.exit(1);
}

// --- Helper: Generate Tokens ---
const generateTokens = (userId, rememberMe) => {
    const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    let refreshToken = null;
    if (rememberMe) {
        refreshToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    }
    return { accessToken, refreshToken };
};

// --- Validation & Sanitization Rules ---

// Rules for Registration
export const registerValidationRules = () => {
    return [
        body('restaurantName', 'Restaurant Name is required').notEmpty().trim().escape(),
        body('contactName', 'Contact Name is required').notEmpty().trim().escape(),
        body('email', 'Valid Email is required').isEmail().normalizeEmail(),
        body('phone', 'Valid Phone number is required (8-20 digits, may include +, -, space, ())')
            .matches(/^\+?[0-9\s-()]{8,20}$/) // Keep your specific regex
            .trim().escape(), // Still escape after validation
        body('address', 'Address is required').notEmpty().trim().escape(), // Added validation
        body('password', 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character')
            .isStrongPassword({
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
            }),
        // Do not escape password itself, hashing takes care of storage safety
        body('agreeToTerms', 'You must agree to the terms').isBoolean().toBoolean().equals('true')
    ];
};

// Rules for Login
export const loginValidationRules = () => {
    return [
        // Only one of email or phone should be provided, but validate/sanitize if they exist
        body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format').normalizeEmail(),
        body('phone').optional({ checkFalsy: true })
            .matches(/^\+?[0-9\s-()]{8,20}$/).withMessage('Invalid phone number format')
            .trim().escape(),
        body('password', 'Password is required').notEmpty(),
        // Custom validation to ensure at least email or phone is present
        body().custom((value, { req }) => {
            if (!req.body.email && !req.body.phone) {
                throw new Error('Email or phone number is required for login.');
            }
            return true;
        })
    ];
};


// --- Controller Functions ---

// User Registration (Updated with Validation Check)
export const registerUser = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Sanitized data is now available in req.body
    const { restaurantName, contactName, email, phone, address, password } = req.body;

    try {
        // Check if email exists (using the sanitized 'email' field)
        const existingUser = await User.findOne({ mail: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered.", errors: [{ param: 'email', msg: 'Email is already registered.' }] });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user using sanitized data
        const newUser = new User({
            restaurantName, // Already trimmed via validation
            userName: contactName, // Already trimmed via validation
            mail: email, // Already normalized via validation
            phone, // Already trimmed via validation
            address, // Already trimmed via validation
            password: hashedPassword,
        });

        const savedUser = await newUser.save();

        // Create Default Restaurant Profile (Keep existing logic)
        try {
            const newProfile = new RestaurantProfile({
                restaurant: savedUser._id,
                name: savedUser.restaurantName,
                description: '',
                primaryPhone: savedUser.phone,
                email: savedUser.mail,
                website: '',
                logoUrl: null,
                coverImageUrl: null,
                branches: [],
                isDeliveryEnabled: false
            });
            await newProfile.save();
            console.log(`Default profile created for user ${savedUser._id}`);
        } catch (profileError) {
            console.error(`Failed to create default profile for user ${savedUser._id}:`, profileError);
        }

        // Generate Tokens (Subscription check not needed on registration)
        const { accessToken } = generateTokens(savedUser._id, false); // No refresh token needed here usually

        res.status(201).json({
            message: `User ${savedUser.restaurantName} registered successfully!`,
            user: { // Send back minimal user info
                id: savedUser._id,
                restaurantName: savedUser.restaurantName,
                userName: savedUser.userName,
                mail: savedUser.mail
            },
            accessToken,
        });

    } catch (error) {
        console.error('Registration Error:', error);
        // Handle potential duplicate key errors etc. from the database save
        if (error.code === 11000) { // Example: duplicate key error
            return res.status(400).json({ message: "An account with similar details might already exist." });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: "Validation Error", errors: messages });
        }
        res.status(500).json({ message: "Server error during registration." });
    }
};
// User Login (Temporary: allow login if subscription inactive unless explicitly enforced)
export const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, password, rememberMe } = req.body;

    try {
        // Determine login identifier
        const identifier = email ? { mail: email } : { phone };

        // Just fetch password for verification, no subscriptionStatus
        const user = await User.findOne(identifier).select('+password');
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Always issue tokens (ignoring subscription)
        const { accessToken, refreshToken } = generateTokens(user._id, rememberMe);

        console.log(`User ${user._id} login successful (subscription ignored for now)`);

        return res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                restaurantName: user.restaurantName,
                userName: user.userName,
                mail: user.mail
                // subscriptionStatus intentionally omitted
            },
            accessToken,
            ...(refreshToken && { refreshToken })
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Server error during login." });
    }
};


// getUserProfile - No changes needed here, assuming 'protect' middleware selects needed fields
export const getUserProfile = async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/auth/me - User ID from protect: ${req.userId}`);
    try {
        if (!req.user) {
            console.error(`getUserProfile Error: req.user not found after protect middleware for user ${req.userId}`);
            return res.status(404).json({ message: 'User data not found after authentication.' });
        }
        console.log(`[${new Date().toISOString()}] Sending user profile for ${req.user._id}`);
        res.status(200).json({
            _id: req.user._id,
            id: req.user._id,
            username: req.user.userName,
            email: req.user.mail,
            restaurantName: req.user.restaurantName,
            // Include subscriptionStatus if protect middleware selects it or fetch it again
            // It's often useful for the frontend to know the status on profile load
            // Example if protect doesn't fetch it:
            // const userWithStatus = await User.findById(req.user._id).select('subscriptionStatus');
            // subscriptionStatus: userWithStatus ? userWithStatus.subscriptionStatus : null,
            // If protect middleware *does* select it:
            subscriptionStatus: req.user.subscriptionStatus || null, // Send status from protect middleware if available
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in getUserProfile for user ${req.userId}:`, error);
        res.status(500).json({ message: "Server Error fetching user profile." });
    }
};
