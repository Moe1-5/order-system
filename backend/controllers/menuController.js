// controllers/menuController.js
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import MenuItem from "../models/menuItem.js"; // Ensure your MenuItem model has an addOns: [String] field
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// --- AWS S3 Configuration ---
// ... (your S3 config remains the same) ...
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
    console.error("FATAL ERROR: Missing required AWS S3 environment variables in menuController.");
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

// --- S3 Helper Functions ---
// ... (your S3 helpers remain the same) ...
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


// --- ADMIN Controller Functions ---

// GET /api/menu
export const getMenuItems = async (req, res) => {
    // ... (no changes needed here for addOns) ...
    console.log(`[${new Date().toISOString()}] GET /api/menu - User: ${req.userId}`);
    try {
        if (!req.userId) return res.status(401).json({ message: 'User not authenticated' });
        const menuItems = await MenuItem.find({ restaurant: req.userId }).sort({ category: 1, name: 1 });
        const categories = await MenuItem.distinct('category', { restaurant: req.userId });
        console.log(`[${new Date().toISOString()}] Found ${menuItems.length} items, ${categories.length} categories for user ${req.userId}`);
        res.status(200).json({
            menuItems: menuItems || [],
            categories: ['All', ...categories]
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching menu items for user ${req.userId}:`, error);
        res.status(500).json({ message: 'Server error fetching menu items.' });
    }
};

// POST /api/menu
export const addMenuItem = async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/menu - User: ${req.userId}`);
    const imageFile = req.file;
    console.log("Received file:", imageFile ? imageFile.originalname : 'None');
    console.log("Received body:", req.body);
    try {
        // Destructure componentsJson and extrasJson from req.body
        const { name, description, price, category, isAvailable,
            components: componentsJson, // Renamed from addOnsJson
            extras: extrasJson
        } = req.body;
        const ownerId = req.userId;

        if (!ownerId) return res.status(401).json({ message: 'User not authenticated' });
        if (!name || price === undefined || !category) return res.status(400).json({ message: 'Name, price, and category required.' });
        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice < 0) return res.status(400).json({ message: 'Invalid price.' });

        // --- Parse components (formerly addOns) ---
        let componentsArray = [];
        if (componentsJson) {
            try {
                componentsArray = JSON.parse(componentsJson);
                if (!Array.isArray(componentsArray)) {
                    console.warn("Parsed components is not an array, defaulting to empty array.");
                    componentsArray = [];
                }
                componentsArray = componentsArray.map(comp => String(comp).trim()).filter(Boolean);
            } catch (parseError) {
                console.error("Error parsing components JSON on add:", parseError);
                return res.status(400).json({ message: 'Invalid format for components data.' });
            }
        }

        // --- Parse extras ---
        let extrasArray = [];
        if (extrasJson) {
            try {
                extrasArray = JSON.parse(extrasJson);
                if (!Array.isArray(extrasArray)) {
                    console.warn("Parsed extras is not an array, defaulting to empty array.");
                    extrasArray = [];
                }
                // Validate each extra object (must have name and price)
                extrasArray = extrasArray.filter(extra =>
                    extra && typeof extra.name === 'string' && extra.name.trim() !== '' &&
                    typeof extra.price === 'number' && extra.price >= 0
                ).map(extra => ({ name: extra.name.trim(), price: extra.price }));
            } catch (parseError) {
                console.error("Error parsing extras JSON on add:", parseError);
                return res.status(400).json({ message: 'Invalid format for extras data.' });
            }
        }

        let imageUrl = null;
        if (imageFile) { /* ... (S3 upload logic remains same) ... */
            imageUrl = await uploadToS3(imageFile.buffer, imageFile.originalname, imageFile.mimetype, 'menu-items', ownerId);
        }


        const newItem = new MenuItem({
            restaurant: ownerId,
            name: name.trim(),
            description: description ? description.trim() : '',
            price: numericPrice,
            category: category.trim(),
            isAvailable: String(isAvailable).toLowerCase() === 'true',
            imageUrl,
            components: componentsArray, // Assign parsed components
            extras: extrasArray,       // Assign parsed extras
        });
        const savedItem = await newItem.save();
        console.log(`[${new Date().toISOString()}] Menu item ${savedItem._id} added for user ${ownerId}`);
        res.status(201).json(savedItem);

    } catch (error) {
        // ... (error handling remains similar) ...
        console.error(`[${new Date().toISOString()}] Error adding menu item for user ${req.userId}:`, error);
        if (error.message.includes('Failed to upload')) return res.status(500).json({ message: error.message });
        if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map(e => e.message) });
        res.status(500).json({ message: 'Server error adding menu item.' });
    }
};
export const updateMenuItem = async (req, res) => {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] PUT /api/menu/${id} - User: ${req.userId}`);
    const imageFile = req.file;
    console.log("Received file:", imageFile ? imageFile.originalname : 'None');
    console.log("Received body:", req.body);
    try {
        const { name, description, price, category, isAvailable, removeImage,
            components: componentsJson, // Renamed
            extras: extrasJson
        } = req.body;
        const ownerId = req.userId;

        if (!ownerId) return res.status(401).json({ message: 'User not authenticated' });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid item ID.' });

        const itemToUpdate = await MenuItem.findOne({ _id: id, restaurant: ownerId });
        if (!itemToUpdate) return res.status(404).json({ message: 'Item not found or unauthorized.' });

        // --- Parse components ---
        if (componentsJson !== undefined) { // Only update if componentsJson was sent
            try {
                const parsed = JSON.parse(componentsJson);
                if (Array.isArray(parsed)) {
                    itemToUpdate.components = parsed.map(comp => String(comp).trim()).filter(Boolean);
                } else {
                    console.warn("Parsed components for update is not an array, ignoring.");
                }
            } catch (parseError) {
                console.error("Error parsing components JSON on update:", parseError);
                return res.status(400).json({ message: 'Invalid format for components data.' });
            }
        }

        // --- Parse extras ---
        if (extrasJson !== undefined) { // Only update if extrasJson was sent
            try {
                const parsed = JSON.parse(extrasJson);
                if (Array.isArray(parsed)) {
                    // Validate each extra object
                    itemToUpdate.extras = parsed.filter(extra =>
                        extra && typeof extra.name === 'string' && extra.name.trim() !== '' &&
                        typeof extra.price === 'number' && extra.price >= 0
                    ).map(extra => ({ name: extra.name.trim(), price: extra.price }));
                } else {
                    console.warn("Parsed extras for update is not an array, ignoring.");
                }
            } catch (parseError) {
                console.error("Error parsing extras JSON on update:", parseError);
                return res.status(400).json({ message: 'Invalid format for extras data.' });
            }
        }

        const oldImageUrl = itemToUpdate.imageUrl;
        let newImageUrl = itemToUpdate.imageUrl;
        let imageActionTaken = false;

        if (imageFile) { /* ... (S3 upload logic remains same) ... */
            newImageUrl = await uploadToS3(imageFile.buffer, imageFile.originalname, imageFile.mimetype, 'menu-items', ownerId);
            if (oldImageUrl && oldImageUrl !== newImageUrl) imageActionTaken = true;
        } else if (String(removeImage).toLowerCase() === 'true') {
            newImageUrl = null;
            if (oldImageUrl) imageActionTaken = true;
        }

        if (name !== undefined) itemToUpdate.name = name.trim();
        if (description !== undefined) itemToUpdate.description = description ? description.trim() : '';
        if (price !== undefined) { /* ... (price logic remains same) ... */
            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) return res.status(400).json({ message: 'Invalid price.' });
            itemToUpdate.price = numericPrice;
        }
        if (category !== undefined) itemToUpdate.category = category.trim();
        if (isAvailable !== undefined) itemToUpdate.isAvailable = String(isAvailable).toLowerCase() === 'true';
        itemToUpdate.imageUrl = newImageUrl;
        // components and extras are updated directly on itemToUpdate above

        const updatedItem = await itemToUpdate.save();

        if (imageActionTaken && oldImageUrl) { /* ... (S3 delete logic remains same) ... */
            await deleteFromS3(oldImageUrl);
        }

        console.log(`[${new Date().toISOString()}] Menu item ${updatedItem._id} updated for user ${ownerId}`);
        res.status(200).json(updatedItem);

    } catch (error) {
        // ... (error handling remains similar) ...
        console.error(`[${new Date().toISOString()}] Error updating menu item ${id} for user ${req.userId}:`, error);
        if (error.message.includes('Failed to upload')) return res.status(500).json({ message: error.message });
        if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: 'Validation failed', errors: Object.values(error.errors).map(e => e.message) });
        res.status(500).json({ message: 'Server error updating menu item.' });
    }
};

// ... (updateItemAvailability and deleteMenuItem remain the same for now) ...


// PATCH /api/menu/:id/availability
// ... (no changes needed here for addOns) ...
export const updateItemAvailability = async (req, res) => {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] ---> ENTERING PATCH /api/menu/${id}/availability - User: ${req.userId}`);
    console.log(`[${new Date().toISOString()}] Request Body:`, req.body);
    try {
        const { isAvailable } = req.body;
        const ownerId = req.userId;
        if (!ownerId) {
            console.error(`[${new Date().toISOString()}] updateItemAvailability Error: User ID not found.`);
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (typeof isAvailable !== 'boolean') {
            console.error(`[${new Date().toISOString()}] updateItemAvailability Error: Invalid 'isAvailable' value received. Type: ${typeof isAvailable}, Value: ${isAvailable}`);
            return res.status(400).json({ message: 'Invalid availability value. Must be true or false.' });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[${new Date().toISOString()}] updateItemAvailability Error: Invalid item ID format: ${id}`);
            return res.status(400).json({ message: 'Invalid item ID.' });
        }
        console.log(`[${new Date().toISOString()}] Validations passed. Target status: ${isAvailable}`);
        console.log(`[${new Date().toISOString()}] Attempting to update item ${id} for owner ${ownerId} with isAvailable=${isAvailable}`);
        const updatedItem = await MenuItem.findOneAndUpdate(
            { _id: id, restaurant: ownerId },
            { $set: { isAvailable: isAvailable } },
            { new: true, runValidators: true }
        );
        if (!updatedItem) {
            console.error(`[${new Date().toISOString()}] updateItemAvailability Error: Item not found or unauthorized for ID: ${id}, restaurant: ${ownerId}`);
            return res.status(404).json({ message: 'Item not found or unauthorized.' });
        }
        console.log(`[${new Date().toISOString()}] Availability updated successfully for item ${id} to ${isAvailable}`);
        res.status(200).json(updatedItem);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] !!! CATCH BLOCK ERROR in updateItemAvailability for item ${id}, user ${req.userId}:`, error);
        res.status(500).json({ message: 'Server error updating availability.' });
    }
};

// DELETE /api/menu/:id
// ... (no changes needed here for addOns) ...
export const deleteMenuItem = async (req, res) => {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] DELETE /api/menu/${id} - User: ${req.userId}`);
    try {
        const ownerId = req.userId;
        if (!ownerId) return res.status(401).json({ message: 'User not authenticated' });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid item ID.' });
        const itemToDelete = await MenuItem.findOne({ _id: id, restaurant: ownerId });
        if (!itemToDelete) return res.status(404).json({ message: 'Item not found or unauthorized.' });
        const imageUrl = itemToDelete.imageUrl;
        const result = await MenuItem.deleteOne({ _id: id, restaurant: ownerId });
        if (result.deletedCount === 0) {
            console.warn(`[${new Date().toISOString()}] Failed to delete item ${id} from DB for user ${ownerId}.`);
            return res.status(404).json({ message: 'Item deletion failed unexpectedly.' });
        }
        console.log(`[${new Date().toISOString()}] Menu item ${id} deleted from DB for user ${ownerId}`);
        if (imageUrl) {
            console.log(`Deleting S3 image: ${imageUrl}`);
            await deleteFromS3(imageUrl);
        }
        res.status(200).json({ message: 'Menu item deleted successfully', id: id });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting menu item ${id} for user ${req.userId}:`, error);
        res.status(500).json({ message: 'Server error deleting menu item.' });
    }
};


// --- PUBLIC Controller Function ---

// GET /api/public/menu/:restaurantId
// ... (no changes needed here for addOns, unless you want to expose them publicly) ...
// If you DO want to expose them, make sure 'addOns' is included in the .select()
export const getPublicMenuItems = async (req, res) => {
    const { restaurantId } = req.params;
    console.log(`[${new Date().toISOString()}] GET /api/public/menu/${restaurantId}`);
    try {
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid Restaurant ID format.' });
        }
        const menuItems = await MenuItem.find({
            restaurant: restaurantId,
            isAvailable: true
        })
            .select('name description price category imageUrl components extras isAvailable')
            .sort({ category: 1, name: 1 });

        console.log(`[${new Date().toISOString()}] Found ${menuItems.length} public menu items for restaurant ${restaurantId}`);
        res.status(200).json(menuItems);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching public menu items for restaurant ${restaurantId}:`, error);
        res.status(500).json({ message: 'Server error fetching menu.' });
    }
};
