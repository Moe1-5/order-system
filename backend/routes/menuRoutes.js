import express from 'express';
import {
    getMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateItemAvailability
} from '../controllers/menuController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import  requireActiveSubscription from "../middleware/subscriptionCheckMiddleware.js"

const router = express.Router();

router.route('/menu')
    .get(protect, requireActiveSubscription, getMenuItems)
    .post(protect, upload.single('itemImage'), addMenuItem); // Expect single file field named 'itemImage'

router.route('/menu/:id')
    .put(protect,  upload.single('itemImage'), updateMenuItem) // Also handle optional image upload on update
    .delete(protect, deleteMenuItem);

router.patch('/menu/:id/availability', protect, updateItemAvailability); // Route for PATCH availability

export default router;
