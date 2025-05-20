import express from 'express';
import { getSiteInfo, updateSiteInfo } from '../controllers/siteInfoController.js';
import protect from '../middleware/authMiddleware.js'; // Import your auth middleware
import upload from '../middleware/uploadMiddleware.js'; // Import multer middleware
import requireActiveSubscription from '../middleware/subscriptionCheckMiddleware.js';
const router = express.Router();

// Define routes for /api/site-info
// All routes protected by authentication middleware

// GET /api/site-info - Fetch the current user's site info
router.get('/site-info', protect, requireActiveSubscription, getSiteInfo);

// PUT /api/site-info - Update the current user's site info
// Use multer middleware here to handle potential file uploads in multipart/form-data
// '.fields' allows specifying multiple expected file fields
router.put(
    '/site-info',
    protect,
    requireActiveSubscription,
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ]),
    updateSiteInfo
);

export default router;
