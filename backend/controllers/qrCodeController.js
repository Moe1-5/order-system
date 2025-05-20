// controllers/qrCodeController.js
import QRCodeConfig from '../models/QRCodeConfig.js'; // Ensure correct path
import User from '../models/user.js'; // Import User model if needed elsewhere, not strictly required here
import mongoose from 'mongoose';
import qr from 'qrcode'; // Library to generate QR code data/images
import PDFDocument from 'pdfkit'; // Library to generate PDFs
import { PassThrough } from 'stream'; // Node.js stream utility
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// --- Helper: Get Target URL (Robust Version) ---
const getTargetUrl = (type, tableNumber, ownerId) => {
    // 1. Get Base URL
    let baseUrl = process.env.CUSTOMER_APP_URL;
    // 2. Validate Base URL
    if (!baseUrl) {
        console.warn("!!! CRITICAL WARNING: CUSTOMER_APP_URL environment variable is not set! QR Codes will not point to the correct customer application. Using placeholder: 'http://localhost:3000'. Please set this variable in your .env file.");
        baseUrl = 'http://localhost:3000'; // Sensible fallback for local development
    } else {
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `http://${baseUrl}`; // Prepend http:// if missing
        }
        baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    }
    // 3. Validate Owner ID
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
        console.error(`!!! ERROR: Invalid or missing ownerId ("${ownerId}") provided for target URL generation.`);
        return `${baseUrl}/invalid-restaurant-id`; // Indicate error in URL
    }
    // 4. Construct Path and Query
    let path = '/menu'; // Default fallback path
    const query = `?restaurant=${ownerId}`;
    if (type === 'table' && tableNumber !== null && tableNumber !== undefined) {
        const parsedTable = parseInt(tableNumber);
        if (!isNaN(parsedTable) && parsedTable >= 0) {
            path = `/order/table/${parsedTable}`;
        } else {
            console.warn(`WARN: Invalid tableNumber ("${tableNumber}") for type 'table' (owner: ${ownerId}). Using fallback path.`);
            path = `/order/invalid-table`; // Example error path
        }
    } else if (type === 'pickup-delivery') {
        path = `/order/general`;
    } else if (type !== 'table') { // Log if type is unexpected but not 'table'
        console.warn(`WARN: Unknown QR code type "${type}" encountered (owner: ${ownerId}). Using default path "${path}".`);
    }
    // 5. Combine and Return
    return `${baseUrl}${path}${query}`;
};

// === CONTROLLER FUNCTIONS ===

// @desc    Get all QR codes for the logged-in user
// @route   GET /api/qrcodes
// @access  Private (Requires req.userId from 'protect' middleware)
export const getQrCodes = async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/qrcodes - User: ${req.userId}`);
    try {
        if (!req.userId) {
            console.error("getQrCodes Error: User ID not found in request.");
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const qrCodeConfigs = await QRCodeConfig.find({ restaurant: req.userId })
            .sort({ createdAt: -1 });
        console.log(`[${new Date().toISOString()}] Found ${qrCodeConfigs.length} QR codes for user ${req.userId}`);
        res.status(200).json(qrCodeConfigs || []); // Always return array
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in getQrCodes for user ${req.userId}:`, error);
        res.status(500).json({ message: 'Server error fetching QR codes.' });
    }
};

// @desc    Add a new QR code configuration
// @route   POST /api/qrcodes
// @access  Private (Requires req.userId)
export const addQrCode = async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/qrcodes - User: ${req.userId}`);
    try {
        const { name, type, tableNumber, color } = req.body;
        const ownerId = req.userId;

        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }
        if (!name || !type) { return res.status(400).json({ message: 'Name and Type are required.' }); }
        if (!['table', 'pickup-delivery'].includes(type)) { return res.status(400).json({ message: 'Invalid QR type.' }); }

        let tableNum = null;
        if (type === 'table') {
            if (tableNumber === undefined || tableNumber === null || tableNumber === '' || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) < 0) {
                return res.status(400).json({ message: 'Valid non-negative table number required for Table QR.' });
            }
            tableNum = parseInt(tableNumber);
            const existingTableQR = await QRCodeConfig.findOne({ restaurant: ownerId, type: 'table', tableNumber: tableNum });
            if (existingTableQR) { return res.status(400).json({ message: `QR for Table ${tableNum} already exists.` }); }
        }

        // Generate target URL using the helper (checks CUSTOMER_APP_URL)
        const targetUrl = getTargetUrl(type, tableNum, ownerId);
        if (!targetUrl || targetUrl.includes('invalid-')) { // Check for error URLs from helper
            console.error(`addQrCode Error: Failed to generate valid target URL. Check CUSTOMER_APP_URL env var and ownerId.`);
            return res.status(500).json({ message: 'Server error generating QR target URL.' });
        }

        const newQrConfig = new QRCodeConfig({
            restaurant: ownerId,
            name: name.trim(),
            type,
            tableNumber: tableNum,
            targetUrl, // Store the generated URL
            styleOptions: { color: color || '#000000' }
        });

        const savedQrConfig = await newQrConfig.save();
        console.log(`[${new Date().toISOString()}] QR Code ${savedQrConfig._id} added for user ${ownerId}, Target: ${targetUrl}`);
        res.status(201).json(savedQrConfig);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in addQrCode for user ${req.userId}:`, error);
        if (error instanceof mongoose.Error.ValidationError) { return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map(e => e.message) }); }
        res.status(500).json({ message: 'Server error adding QR code.' });
    }
};

// @desc    Update an existing QR code configuration
// @route   PUT /api/qrcodes/:id
// @access  Private (Requires req.userId)
export const updateQrCode = async (req, res) => {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] PUT /api/qrcodes/${id} - User: ${req.userId}`);
    try {
        const { name, type, tableNumber, color } = req.body;
        const ownerId = req.userId;

        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }
        if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ message: 'Invalid QR ID format.' }); }

        const qrConfig = await QRCodeConfig.findOne({ _id: id, restaurant: ownerId });
        if (!qrConfig) { return res.status(404).json({ message: 'QR Code not found or unauthorized.' }); }

        const finalType = type ? type : qrConfig.type;
        if (!['table', 'pickup-delivery'].includes(finalType)) { return res.status(400).json({ message: 'Invalid QR type.' }); }

        let finalTableNumber = qrConfig.tableNumber;
        if (finalType === 'table') {
            const newTableNumProvided = tableNumber !== undefined && tableNumber !== null && tableNumber !== '';
            if (!newTableNumProvided) { return res.status(400).json({ message: 'Valid table number required for Table QR.' }); }
            const parsedTableNum = parseInt(tableNumber);
            if (isNaN(parsedTableNum) || parsedTableNum < 0) { return res.status(400).json({ message: 'Table number must be valid non-negative integer.' }); }
            finalTableNumber = parsedTableNum;

            const conflictingQR = await QRCodeConfig.findOne({ restaurant: ownerId, type: 'table', tableNumber: finalTableNumber, _id: { $ne: id } });
            if (conflictingQR) { return res.status(400).json({ message: `Another QR (${conflictingQR.name}) exists for Table ${finalTableNumber}.` }); }
        } else {
            finalTableNumber = null;
        }

        // Update fields
        qrConfig.name = name ? name.trim() : qrConfig.name;
        qrConfig.type = finalType;
        qrConfig.tableNumber = finalTableNumber;
        if (color) { qrConfig.styleOptions.color = color; }

        // --- CRITICAL: Recalculate targetUrl on update ---
        const newTargetUrl = getTargetUrl(qrConfig.type, qrConfig.tableNumber, ownerId);
        if (!newTargetUrl || newTargetUrl.includes('invalid-')) { // Check for error URLs
            console.error(`updateQrCode Error: Failed to generate valid target URL for ID ${id}. Check CUSTOMER_APP_URL env var.`);
            return res.status(500).json({ message: 'Server error updating QR target URL.' });
        }
        qrConfig.targetUrl = newTargetUrl; // Store the potentially new URL
        // --- End Recalculation ---

        const updatedQrConfig = await qrConfig.save();
        console.log(`[${new Date().toISOString()}] QR Code ${updatedQrConfig._id} updated for user ${ownerId}, New Target: ${newTargetUrl}`);
        res.status(200).json(updatedQrConfig);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in updateQrCode for ID ${id}, user ${req.userId}:`, error);
        if (error instanceof mongoose.Error.ValidationError) { return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map(e => e.message) }); }
        res.status(500).json({ message: 'Server error updating QR code.' });
    }
};

// @desc    Delete a QR code configuration
// @route   DELETE /api/qrcodes/:id
// @access  Private (Requires req.userId)
export const deleteQrCode = async (req, res) => {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] DELETE /api/qrcodes/${id} - User: ${req.userId}`);
    try {
        const ownerId = req.userId;
        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }
        if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ message: 'Invalid QR ID format.' }); }

        const result = await QRCodeConfig.deleteOne({ _id: id, restaurant: ownerId });
        if (result.deletedCount === 0) {
            console.warn(`[${new Date().toISOString()}] Delete failed: QR ${id} not found or not owned by user ${ownerId}.`);
            return res.status(404).json({ message: 'QR Code not found or unauthorized.' });
        }
        console.log(`[${new Date().toISOString()}] QR Code ${id} deleted successfully for user ${ownerId}`);
        res.status(200).json({ message: 'QR Code deleted successfully', id: id });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in deleteQrCode for ID ${id}, user ${req.userId}:`, error);
        res.status(500).json({ message: 'Server error deleting QR code.' });
    }
};

// @desc    Get QR code image data stream
// @route   GET /api/qrcodes/:id/image
// @access  Public (as defined in qrCodeRoutes.js - NO 'protect' middleware)
export const getQrCodeImage = async (req, res) => {
    const { id } = req.params;
    const { download } = req.query;
    // Note: req.userId will be UNDEFINED here because 'protect' is not used on the route
    console.log(`[${new Date().toISOString()}] ---> ENTERING PUBLIC GET /api/qrcodes/${id}/image - Download: ${download}`);
    try {
        // 1. Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[${new Date().toISOString()}] getQrCodeImage Error: Invalid ID format: ${id}`);
            return res.status(400).json({ message: 'Invalid QR Code ID format.' });
        }
        console.log(`[${new Date().toISOString()}] Valid ID format: ${id}`);

        // 2. Find QR Config by ID ONLY (since route is public)
        console.log(`[${new Date().toISOString()}] Finding QR Config with ID: ${id}`);
        const qrConfig = await QRCodeConfig.findOne({ _id: id }); // No owner check needed

        if (!qrConfig) {
            console.error(`[${new Date().toISOString()}] getQrCodeImage Error: QR Code config not found for ID: ${id}`);
            return res.status(404).json({ message: 'QR Code not found.' });
        }
        console.log(`[${new Date().toISOString()}] Found QR Config: ID=${qrConfig._id}, Name=${qrConfig.name}`);

        // 3. Validate targetUrl **CRITICAL STEP**
        const targetUrl = qrConfig.targetUrl;
        console.log(`[${new Date().toISOString()}] Target URL from DB for QR generation: ${targetUrl}`);
        // Added more specific checks for "null" string or missing http/https
        if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.length < 10 || targetUrl.includes('invalid-') || targetUrl.startsWith('http://null') || targetUrl.startsWith('null') || !targetUrl.match(/^https?:\/\//)) {
            console.error(`[${new Date().toISOString()}] getQrCodeImage Error: INVALID targetUrl found for QR ${id}: "${targetUrl}"`);
            return res.status(500).json({ message: 'Cannot generate QR: Invalid target URL configured for this code.' });
        }
        console.log(`[${new Date().toISOString()}] Target URL validated as likely OK.`);

        // 4. Prepare QR Options
        const qrOptions = {
            errorCorrectionLevel: 'H', type: 'png', width: 300, margin: 1,
            color: { dark: qrConfig.styleOptions?.color || '#000000', light: '#FFFFFF' }
        };
        console.log(`[${new Date().toISOString()}] Prepared QR options.`);

        // 5. Generate QR Stream
        console.log(`[${new Date().toISOString()}] Attempting to generate QR stream for URL: ${targetUrl}`);
        const qrStream = new PassThrough();
        await qr.toFileStream(qrStream, targetUrl, qrOptions); // Use validated targetUrl
        console.log(`[${new Date().toISOString()}] QR stream generation seems successful.`);

        // 6. Set Response Headers
        res.setHeader('Content-Type', 'image/png');
        if (download === 'true') {
            const filename = `${qrConfig.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'qrcode'}-${qrConfig.type === 'table' ? `table_${qrConfig.tableNumber}` : 'general'}.png`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            console.log(`[${new Date().toISOString()}] Setting download headers for: ${filename}`);
        } else {
            console.log(`[${new Date().toISOString()}] Setting headers for image display.`);
        }

        // 7. Pipe Stream to Response
        console.log(`[${new Date().toISOString()}] Piping QR stream to response.`);
        qrStream.pipe(res);
        res.on('finish', () => console.log(`[${new Date().toISOString()}] Response stream finished for QR image ${id}.`));
        res.on('error', (err) => console.error(`[${new Date().toISOString()}] Response stream error for QR image ${id}:`, err));

    } catch (error) {
        // 8. Handle Errors during generation/piping
        console.error(`[${new Date().toISOString()}] !!! CATCH BLOCK ERROR in getQrCodeImage for ID ${id}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error generating QR code image.' });
        } else {
            console.error(`[${new Date().toISOString()}] Headers already sent for QR image ${id}, cannot send JSON error.`);
            res.end();
        }
    }
};

// @desc    Get QR code as a printable PDF
// @route   GET /api/qrcodes/:id/pdf
// @access  Private (Requires req.userId)
export const getQrCodePdf = async (req, res) => {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] GET /api/qrcodes/${id}/pdf - User: ${req.userId}`);
    try {
        const ownerId = req.userId;
        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }
        if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ message: 'Invalid QR ID format.' }); }

        const qrConfig = await QRCodeConfig.findOne({ _id: id, restaurant: ownerId });
        if (!qrConfig) { return res.status(404).json({ message: 'QR Code not found or unauthorized.' }); }

        // ---> Validate targetUrl before generating PDF <---
        const targetUrl = qrConfig.targetUrl;
        console.log(`[${new Date().toISOString()}] Target URL from DB for PDF generation: ${targetUrl}`);
        if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.length < 10 || targetUrl.includes('invalid-') || targetUrl.startsWith('http://null') || targetUrl.startsWith('null') || !targetUrl.match(/^https?:\/\//)) {
            console.error(`[${new Date().toISOString()}] getQrCodePdf Error: INVALID targetUrl found for QR ${id}: "${targetUrl}"`);
            return res.status(500).json({ message: 'Cannot generate PDF: Invalid target URL configured.' });
        }

        // 1. Generate QR buffer
        const qrOptions = {
            errorCorrectionLevel: 'H', type: 'png', width: 250, margin: 1,
            color: { dark: qrConfig.styleOptions?.color || '#000000', light: '#FFFFFF' }
        };
        const qrImageBuffer = await qr.toBuffer(targetUrl, qrOptions); // Use validated targetUrl

        // 2. Create PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const pdfFilename = `${qrConfig.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'qrcode'}-${qrConfig.type === 'table' ? `table_${qrConfig.tableNumber}` : 'general'}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${pdfFilename}"`);
        doc.pipe(res);

        // 3. Add content
        doc.fontSize(18).text(`QR Code: ${qrConfig.name}`, { align: 'center' });
        doc.moveDown(0.5);
        const subtitle = qrConfig.type === 'table' ? `Table Number: ${qrConfig.tableNumber}` : 'Type: Pickup / Delivery';
        doc.fontSize(14).text(subtitle, { align: 'center' });
        doc.moveDown(1);
        const qrWidth = qrOptions.width;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const qrX = (pageWidth - qrWidth) / 2 + doc.page.margins.left;
        doc.image(qrImageBuffer, qrX, doc.y, { width: qrWidth, align: 'center', valign: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text('Scan this code to view the menu and order.', { align: 'center' });
        doc.moveDown(0.2);
        doc.fillColor('blue').text(targetUrl, { link: targetUrl, underline: true, align: 'center' }); // Use validated targetUrl
        doc.fillColor('black');
        doc.fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, doc.page.margins.left, doc.page.height - doc.page.margins.bottom + 10, { align: 'center' });

        // Finalize
        doc.end();
        console.log(`[${new Date().toISOString()}] Generated and sent PDF for QR Code ${id}`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error generating QR code PDF for ID ${id}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error generating QR code PDF.' });
        } else {
            console.error("Error after PDF headers sent, ending response.");
            res.end();
        }
    }
};
