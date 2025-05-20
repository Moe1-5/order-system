// Example: routes/analyticsRoutes.js
import express from 'express';
import { getSalesOverTime, getOrderCategories } from '../controllers/analyticsController.js'; // Create this controller
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Use query parameters for period
router.route('/sales-over-time').get(protect, getSalesOverTime);
router.route('/order-categories').get(protect, getOrderCategories);

export default router;
