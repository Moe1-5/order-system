// controllers/siteInfoController.js
import RestaurantProfile from '../models/RestaurantProfile.js'; // Correct model
import User from '../models/user.js';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"; // AWS SDK v3
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// --- AWS S3 Configuration (Copied here) ---
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
    console.error("FATAL ERROR: Missing required AWS S3 environment variables in siteInfoController.");
    // process.exit(1); // Optional
}
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;
const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// --- S3 Helper Functions (Defined locally in this controller) ---
const uploadToS3 = async (fileBuffer, originalName, mimetype, pathPrefix, userId) => {
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `${pathPrefix}/${userId}/${Date.now()}-${safeOriginalName}`;
    const params = { Bucket: BUCKET_NAME, Key: key, Body: fileBuffer, ContentType: mimetype };
    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        const url = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
        console.log(`S3 Upload Successful (${pathPrefix}). URL: ${url}`);
        return url;
    } catch (error) {
        console.error(`Error uploading to S3 (${pathPrefix}):`, error);
        throw new Error(`Failed to upload ${pathPrefix} image to storage.`);
    }
};
const deleteFromS3 = async (fileUrl) => {
    if (!fileUrl || !fileUrl.includes(BUCKET_NAME)) { return; }
    try {
        const parsedUrl = new URL(fileUrl);
        const key = parsedUrl.pathname.substring(1);
        if (!key) { throw new Error('Could not extract Key'); }
        const params = { Bucket: BUCKET_NAME, Key: key };
        const command = new DeleteObjectCommand(params);
        await s3Client.send(command);
        console.log(`S3 v3 Delete Successful for Key: ${key}`);
    } catch (error) {
        console.error(`Error deleting from S3 (v3 - URL: ${fileUrl}):`, error);
    }
};
// --- End S3 Helpers ---


// --- Admin Function: Get Site Info ---
export const getSiteInfo = async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/siteinfo - User: ${req.userId}`);
    try {
        if (!req.userId) { return res.status(401).json({ message: 'User not authenticated' }); }
        let profile = await RestaurantProfile.findOne({ restaurant: req.userId });

        if (!profile) {
            console.log(`Profile not found for user ${req.userId}, creating default.`);
            const user = await User.findById(req.userId).select('restaurantName phone mail');
            if (!user) { return res.status(404).json({ message: 'Associated user account not found.' }); }
            profile = new RestaurantProfile({
                restaurant: req.userId,
                name: user.restaurantName || 'My Restaurant', // Use 'name' field from RestaurantProfile model
                primaryPhone: user.phone || '',
                email: user.mail || '',
                branches: [],
                isDeliveryEnabled: false
            });
            await profile.save();
            console.log(`Default profile created for user ${req.userId}`);
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching site info for user ${req.userId}:`, error);
        res.status(500).json({ message: 'Server error while fetching site information.' });
    }
};

// --- Admin Function: Update Site Info ---
export const updateSiteInfo = async (req, res) => {
    console.log(`[${new Date().toISOString()}] PUT /api/siteinfo - User: ${req.userId}`);
    console.log("Received files:", req.files); // Log received files from upload.fields
    console.log("Received body:", req.body);
    try {
        if (!req.userId) { return res.status(401).json({ message: 'User not authenticated' }); }

        const { name, description, primaryPhone, email, website, branches: branchesJson, clearLogo, clearCoverImage, isDeliveryEnabled } = req.body;
        const files = req.files || {}; // From upload.fields([{ name: 'logo'}, { name: 'coverImage' }])

        let profile = await RestaurantProfile.findOne({ restaurant: req.userId });
        if (!profile) { return res.status(404).json({ message: 'Restaurant profile not found.' }); }

        const oldLogoUrl = profile.logoUrl;
        const oldCoverImageUrl = profile.coverImageUrl;

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim(); // Use field 'name'
        if (description !== undefined) updateData.description = description.trim();
        if (primaryPhone !== undefined) updateData.primaryPhone = primaryPhone.trim();
        if (email !== undefined) updateData.email = email.trim().toLowerCase();
        if (website !== undefined) updateData.website = website.trim();
        if (isDeliveryEnabled !== undefined) updateData.isDeliveryEnabled = (isDeliveryEnabled === 'true' || isDeliveryEnabled === true);

        if (branchesJson) {
            try {
                const branches = JSON.parse(branchesJson);
                if (!Array.isArray(branches)) throw new Error('Branches data must be an array.');
                // TODO: Add validation for branch structure here
                updateData.branches = branches;
            } catch (parseError) {
                console.error("Error parsing branches JSON:", parseError);
                return res.status(400).json({ message: 'Invalid format for branches data.' });
            }
        }

        // Handle Image Uploads/Clearing using local S3 Helpers
        let newLogoUrl = profile.logoUrl;
        let newCoverUrl = profile.coverImageUrl;
        let deleteOldLogo = false;
        let deleteOldCover = false;

        if (files.logo && files.logo[0]) {
            const logoFile = files.logo[0];
            newLogoUrl = await uploadToS3(logoFile.buffer, logoFile.originalname, logoFile.mimetype, 'site-logos', req.userId); // Different prefix
            if (oldLogoUrl && oldLogoUrl !== newLogoUrl) deleteOldLogo = true;
        } else if (clearLogo === 'true') {
            newLogoUrl = null;
            if (oldLogoUrl) deleteOldLogo = true;
        }

        if (files.coverImage && files.coverImage[0]) {
            const coverFile = files.coverImage[0];
            newCoverUrl = await uploadToS3(coverFile.buffer, coverFile.originalname, coverFile.mimetype, 'site-covers', req.userId); // Different prefix
            if (oldCoverImageUrl && oldCoverImageUrl !== newCoverUrl) deleteOldCover = true;
        } else if (clearCoverImage === 'true') {
            newCoverUrl = null;
            if (oldCoverImageUrl) deleteOldCover = true;
        }

        updateData.logoUrl = newLogoUrl;
        updateData.coverImageUrl = newCoverUrl;

        // Perform Database Update
        const updatedProfile = await RestaurantProfile.findOneAndUpdate(
            { restaurant: req.userId },
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!updatedProfile) { return res.status(404).json({ message: 'Profile update failed.' }); }

        // Perform S3 Deletions
        if (deleteOldLogo && oldLogoUrl) await deleteFromS3(oldLogoUrl); // Use local helper
        if (deleteOldCover && oldCoverImageUrl) await deleteFromS3(oldCoverImageUrl); // Use local helper

        // Name sync is handled by pre-save hook in model

        console.log(`[${new Date().toISOString()}] Site info updated successfully for user ${req.userId}`);
        res.status(200).json({ message: 'Restaurant info updated!', data: updatedProfile });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating site info for user ${req.userId}:`, error);
        if (error.message.includes('Failed to upload')) return res.status(500).json({ message: error.message });
        if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map(e => e.message) });
        res.status(500).json({ message: 'Server error updating site info.' });
    }
};

// --- Public Function: Get Public Site Info ---
export const getPublicSiteInfo = async (req, res) => {
    const { restaurantId } = req.params;
    console.log(`[${new Date().toISOString()}] GET /api/public/siteinfo/${restaurantId}`);
    try {
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid Restaurant ID format.' });
        }
        // Use the correct model and field names ('name', not 'restaurantName')
        const siteInfo = await RestaurantProfile.findOne({ restaurant: restaurantId })
            .select('name logoUrl themeColor'); // Select desired public fields

        if (!siteInfo) {
            console.log(`[${new Date().toISOString()}] Public site info not found for restaurant ${restaurantId}`);
            return res.status(404).json({ message: 'Restaurant information not found.' });
        }

        console.log(`[${new Date().toISOString()}] Found public site info for restaurant ${restaurantId}`);
        res.status(200).json(siteInfo);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching public site info for restaurant ${restaurantId}:`, error);
        res.status(500).json({ message: 'Server error fetching restaurant info.' });
    }
};

// --- Settings Controller (Keep as is or merge if preferred) ---
// Using RestaurantProfile model correctly here
export const updateOperationalSettings = async (req, res) => {
    // ... (Keep existing logic, already uses RestaurantProfile) ...
    try {
        if (!req.userId) { return res.status(401).json({ message: 'User not authenticated' }); }
        const { isDeliveryEnabled } = req.body;
        const updateData = {};
        if (isDeliveryEnabled !== undefined) { updateData.isDeliveryEnabled = (isDeliveryEnabled === 'true' || isDeliveryEnabled === true); }
        if (Object.keys(updateData).length === 0) { return res.status(400).json({ message: 'No settings provided.' }); }
        const updatedProfile = await RestaurantProfile.findOneAndUpdate({ restaurant: req.userId }, { $set: updateData }, { new: true });
        if (!updatedProfile) { return res.status(404).json({ message: 'Profile not found.' }); }
        res.status(200).json({ message: 'Settings updated.', data: { isDeliveryEnabled: updatedProfile.isDeliveryEnabled } });
    } catch (error) {
        console.error('Error updating operational settings:', error);
        res.status(500).json({ message: 'Server error updating settings.' });
    }
};
