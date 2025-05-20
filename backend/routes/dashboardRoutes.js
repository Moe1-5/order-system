// Example: routes/dashboardRoutes.js
import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js'; // Create this controller
import protect from '../middleware/authMiddleware.js'; // Your auth middleware
import  requireActiveSubscription from "../middleware/subscriptionCheckMiddleware.js"

const router = express.Router();

router.route('/stats').get(protect, requireActiveSubscription, getDashboardStats);

export default router;

