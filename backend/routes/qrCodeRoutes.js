import express from 'express';
import {
    getQrCodes,
    addQrCode,
    updateQrCode,
    deleteQrCode,
    getQrCodeImage,
    getQrCodePdf
} from '../controllers/qrCodeController.js';
import protect from '../middleware/authMiddleware.js';
import requireActiveSubscription from '../middleware/subscriptionCheckMiddleware.js';
const router = express.Router();

// Routes for managing QR configurations
router.route('/qrcodes')
    .get(protect,  requireActiveSubscription, getQrCodes)
    .post(protect, requireActiveSubscription, addQrCode);

router.route('/qrcodes/:id')
    .put(protect, updateQrCode)
    .delete(protect, deleteQrCode);

// Routes for generating QR output (Image/PDF)
// Note: getQrCodeImage is public by default in controller, add 'protect' here if needed
router.get('/qrcodes/:id/image', getQrCodeImage);
router.get('/qrcodes/:id/pdf', protect, getQrCodePdf); // PDF generation protected

export default router;
