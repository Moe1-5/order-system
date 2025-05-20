// backend/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from 'multer';
import http from 'http';
import { Server } from 'socket.io';
// Stripe isn't typically needed directly here unless you have logic outside controllers

dotenv.config(); // Load .env variables ASAP

// --- Route Imports ---
import publicRoutes from './routes/publicRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import authRoutes from "./routes/authRoute.js"; // Your file with register, login, me, subscription-status
import siteInfoRoutes from "./routes/siteInfoRoutes.js";
import qrCodeRoutes from "./routes/qrCodeRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import billingRoutes from './routes/billingRoutes.js'; // Your file with checkout, portal, webhook routes

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.DATABASE_URL; // Make sure this matches your .env key name

if (!MONGO_URI) {
    console.error("FATAL ERROR: DATABASE_URL (MONGO_URI) is not defined in environment variables.");
    process.exit(1);
}

// --- CORS Setup ---
const allowedOrigins = [
    process.env.CLIENT_URL, // Your Customer Frontend URL from .env
    process.env.ADMIN_URL,  // Your Admin Frontend URL from .env
    // Add production URLs here later, e.g., 'https://www.yourdomain.com', 'https://admin.yourdomain.com'
].filter(Boolean); // Filters out undefined if ADMIN_URL or CLIENT_URL are not set in .env

if (allowedOrigins.length === 0) {
    console.warn("WARNING: No CLIENT_URL or ADMIN_URL found in .env - CORS might block frontend requests.");
} else {
    console.log("Allowed CORS origins:", allowedOrigins);
}


const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman) OR if origin is in the allowed list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS`)); // More specific error
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Important if your frontend needs to send cookies or authorization headers
    optionsSuccessStatus: 204 // For pre-flight requests
};
app.use(cors(corsOptions));

// --- Create HTTP Server & Socket.IO (Needed for Socket.IO) ---
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins, // Use same origins for Socket.IO
        methods: ["GET", "POST"]
    }
});
// Your Socket.IO connection logic
io.on('connection', (socket) => {
    console.log(`[Socket.IO Server] User connected: ${socket.id}`);
    // ... (rest of your socket logic: join_restaurant_room, disconnect, error) ...
    socket.on('join_restaurant_room', (restaurantId) => {
        console.log(`[Socket.IO Server] Received 'join_restaurant_room' from ${socket.id} for Restaurant ID: ${restaurantId}`);
        if (restaurantId && typeof restaurantId === 'string') {
            const roomName = `restaurant_${restaurantId}`;
            socket.join(roomName);
            console.log(`[Socket.IO Server] Socket ${socket.id} joined room: ${roomName}`);
        } else {
            console.warn(`[Socket.IO Server] Invalid restaurantId ('${restaurantId}') from socket ${socket.id}.`);
        }
    });
    socket.on('disconnect', () => {
        console.log(`[Socket.IO Server] User disconnected: ${socket.id}`);
    });
    socket.on('error', (err) => {
        console.error(`[Socket.IO Server] Socket error for ${socket.id}:`, err);
    });
});

// --- Middleware Order ---

// 1. Special Raw Body Parser *ONLY* for the Stripe Webhook Endpoint
//    The path must EXACTLY match where Stripe will POST to.
//    This MUST come BEFORE express.json()
app.post('/api/payments/stripe-webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
    console.log(`Webhook request received, raw body attached for path: ${req.path}`);
    // The actual logic is in the billingRoutes handler, this just prepares the body.
    next();
});

// 2. Standard Body Parsers for all OTHER routes
app.use(express.json({ limit: '10mb' })); // For parsing application/json
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For parsing application/x-www-form-urlencoded

// 3. Request Logger Middleware (Optional, good for debugging)
app.use((req, res, next) => {
    // Don't log the raw buffer for webhooks in detail
    if (req.path === '/api/payments/stripe-webhooks') {
        console.log(`${req.method} ${req.path} (Webhook Event)`);
    } else {
        console.log(`${req.method} ${req.path}`);
        if (req.body && Object.keys(req.body).length > 0) {
            // console.log('Request Body:', req.body); // Be careful logging sensitive data
        }
    }
    next();
});

// --- API Routes ---
// Note on ordering: If routes have potential overlap or rely on specific middleware, order matters.
// Generally, place more specific routes before more general ones if prefixes overlap.

// Mount billing-specific routes (checkout, portal, webhook handler)
app.use('/api/payments', billingRoutes);

// Mount authentication & user status routes (register, login, me, subscription-status)
app.use('/api/auth', authRoutes); // <<< CORRECTED PREFIX: Use this single prefix for clarity

// Mount other routes
app.use('/api/public', publicRoutes);
app.use('/api', menuRoutes);      // Uses /api/menu internally? Prefix /api is okay.
app.use('/api', siteInfoRoutes);  // Uses /api/siteinfo internally? Prefix /api is okay.
app.use('/api', qrCodeRoutes);    // Uses /api/qrcodes internally? Prefix /api is okay.
app.use('/api', orderRoutes);     // Uses /api/orders internally? Prefix /api is okay.
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- Simple Root Route ---
app.get('/', (req, res) => {
    res.status(200).type('text/plain').send("ScanPlate Backend API Running!");
});

// --- Not Found Handler (Optional but good practice) ---
app.use((req, res, next) => {
    res.status(404).json({ error: `Not Found - Cannot ${req.method} ${req.originalUrl}` });
});

// --- Global Error Handling Middleware (MUST be LAST) ---
app.use((err, req, res, next) => {
    console.error("--- Unhandled Error ---");
    console.error("Path:", req.path);
    console.error("Error:", err.message);
    // Avoid logging full stack trace in production unless necessary for debugging logs
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `File Upload Error: ${err.message}`, code: err.code });
    } else if (err.message.includes('Not allowed by CORS')) { // Check error message from CORS config
        return res.status(403).json({ message: "CORS Error: This origin is not permitted." });
    } else if (err.status) { // Handle errors with a specific status code
        return res.status(err.status).json({ message: err.message });
    }

    // Generic fallback
    res.status(500).json({ message: "Internal Server Error" });
});

// --- DB Connection & Server Start ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected!");
        // Start listening on the httpServer instance for Socket.IO compatibility
        httpServer.listen(PORT, () => {
            console.log(`Server (with Socket.IO) running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("!!! MongoDB Connection Error:", err.message); // Log only message initially
        // console.error(err); // Log full error if needed
        process.exit(1); // Exit if database connection fails on startup
    });

export { io }; // Export Socket.IO instance if needed by other modules
