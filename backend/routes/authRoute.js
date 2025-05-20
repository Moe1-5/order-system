// routes/authRoute.js
import express from "express";
import { registerUser, loginUser, getUserProfile } from "../controllers/authController.js";
import { getSubscriptionStatus } from '../controllers/billingController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/register", registerUser); // Corrected path

router.post("/login", loginUser); // Corrected path

router.get('/me', protect, getUserProfile); // Corrected path

router.get('/subscription-status', protect, getSubscriptionStatus);

export default router;
