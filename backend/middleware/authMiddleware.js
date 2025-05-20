// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js'; // Adjust path as needed
import dotenv from 'dotenv';

dotenv.config();

const protect = async (req, res, next) => {
    let token;
    console.log(`\n--- Protect Middleware Triggered for: ${req.method} ${req.originalUrl} ---`); // Log which request
    console.log('Authorization Header:', req.headers.authorization || 'Not Present'); // Log header

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log('Token Extracted:', token ? `Yes (${token.substring(0, 10)}...)` : 'No'); // Log token presence

            if (!token) {
                // This case shouldn't be hit if split works, but good check
                return res.status(401).json({ message: 'Not authorized, token format issue' });
            }

            // Verify token
            const secret = process.env.JWT_SECRET;
            console.log('Verifying Token with Secret:', secret ? 'Loaded' : '!!! JWT_SECRET MISSING IN ENV !!!');
            if (!secret) {
                throw new Error('JWT_SECRET environment variable not set on server.');
            }

            const decoded = jwt.verify(token, secret);
            console.log('Token Decoded Payload:', decoded); // Log the decoded payload

            if (!decoded.id) {
                console.error('Decoded token is missing "id" property.');
                throw new Error('Invalid token payload');
            }

            // Get user from the token ID (excluding password)
            console.log(`Finding User with ID: ${decoded.id}`);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.error(`User not found in DB for ID: ${decoded.id}`);
                // Don't throw an error here directly, let the response reflect it
                return res.status(401).json({ message: 'Not authorized, user for token not found' });
                // throw new Error('User not found');
            }

            console.log('User Found:', req.user.userName || req.user.id); // Log user found
            req.userId = decoded.id; // Attach userId directly

            next(); // Proceed to the next middleware/controller

        } catch (error) {
            console.error('TOKEN VERIFICATION/USER LOOKUP FAILED:', error.name, '-', error.message); // Log specific error
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: `Not authorized, token failed (${error.message})` });
            }
            // Handle specific user not found error if thrown above (optional)
            if (error.message === 'User not found' || error.message === 'Invalid token payload') {
                return res.status(401).json({ message: `Not authorized, ${error.message}` });
            }
            // Generic fallback
            return res.status(401).json({ message: 'Not authorized, server error during token check' });
        }
    } else {
        // No 'Bearer ' token found
        console.log('No Bearer token found in Authorization header.');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // This check is redundant if the above logic is correct, but harmless
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token (final check)' });
    }
};

export default protect;
