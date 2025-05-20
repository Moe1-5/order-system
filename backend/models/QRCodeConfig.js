import mongoose from 'mongoose';

const qrCodeConfigSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { // Simplified types
        type: String,
        required: true,
        enum: ['table', 'pickup-delivery'], // Only these two types
    },
    targetUrl: { // The URL this QR code will point to (can be dynamic)
        type: String,
        required: true,
    },
    tableNumber: { // Only relevant for 'table' type
        type: Number,
        sparse: true, // Allows null/undefined values without unique conflicts if needed
        default: null,
    },
    // Styling (can be nested)
    styleOptions: {
        color: { type: String, default: '#000000' },
        // logoUrl: { type: String, default: null }, // Maybe store logo URL if customizable per QR? For now, assume restaurant logo is used.
        // rounded: { type: Boolean, default: true }, // Style choices often handled frontend/generation library
        // size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' } // Size might be better handled at download/display time
    },
    // Tracking
    scanCount: { type: Number, default: 0 },
    lastScanAt: { type: Date, default: null },

}, { timestamps: true });

// Optional: Ensure table number is unique per owner if type is 'table'
// qrCodeConfigSchema.index({ owner: 1, tableNumber: 1 }, { unique: true, partialFilterExpression: { type: 'table', tableNumber: { $ne: null } } });

const QRCodeConfig = mongoose.model('QRCodeConfig', qrCodeConfigSchema);

export default QRCodeConfig;

