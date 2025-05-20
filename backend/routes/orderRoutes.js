import express from 'express';
import {
    getOrders,
    getOrderById,
    updateOrderStatus
} from '../controllers/orderController.js';
import protect from '../middleware/authMiddleware.js';
import requireActiveSubscription from '../middleware/subscriptionCheckMiddleware.js';
const router = express.Router();

router.route('/orders')
    .get(protect, requireActiveSubscription, getOrders);
// POST /orders would be for creating orders (if needed in admin)

router.route('/orders/:id')
    .get(protect, getOrderById);

router.patch('/orders/:id/status', protect, updateOrderStatus);

export default router;
