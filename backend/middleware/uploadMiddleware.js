// middleware/uploadMiddleware.js
import multer from 'multer';

// Configure Multer
// For now, use memoryStorage. When integrating S3, you might use multer-s3 or handle the buffer directly.
const storage = multer.memoryStorage();

// File filter (optional: restrict to image types)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Not an image! Please upload only images.'), false); // Reject file
    }
};

const upload = multer({
    storage: storage,
    // fileFilter: fileFilter, // Enable if you want server-side type checking
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB file size limit (adjust as needed)
    }
});

export default upload;
