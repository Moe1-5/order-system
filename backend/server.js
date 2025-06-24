// backend/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from 'multer';
import http from 'http';
import { Server } from 'socket.io';


dotenv.config();

// --- Route Imports ---
import publicRoutes from './routes/publicRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import authRoutes from "./routes/authRoute.js";
import siteInfoRoutes from "./routes/siteInfoRoutes.js";
import qrCodeRoutes from "./routes/qrCodeRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import billingRoutes from './routes/billingRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const MONGO_URI = process.env.DATABASE_URL;

if (!MONGO_URI) {
    console.error("FATAL ERROR: DATABASE_URL (MONGO_URI) is not defined in environment variables.");
    process.exit(1);
}


const allowedOrigins = [
    process.env.CUSTOMER_APP_URL,
    process.env.ADMIN_URL,

].filter(Boolean);


const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));


const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});
// Your Socket.IO connection logic
io.on('connection', (socket) => {
    console.log(`[Socket.IO Server] User connected: ${socket.id}`);

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
mongoose.connect(MONGO_URI) // KEEP THIS - VERY IMPORTANT FOR TESTING THE CRASH
    .then(() => {
        console.log("MongoDB Connected! (Minimal Test)");
        httpServer.listen(PORT, '0.0.0.0', () => { // Ensure 0.0.0.0 for listening
            console.log(`Minimal Server (with Socket.IO base) running on port ${PORT}, listening on 0.0.0.0`);
        });
    })
    .catch((err) => {
        console.error("!!! MongoDB Connection Error (Minimal Test):", err.message);
        process.exit(1);
    });

export { io }; 
