// models/RestaurantProfile.js
import mongoose from 'mongoose';
import branchSchemaDefinition from './branchSchema.js';

const restaurantProfileSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: [true, "Restaurant name is required."], trim: true },
    description: { type: String, trim: true, default: '' },
    primaryPhone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    website: { type: String, trim: true, default: '' },
    logoUrl: { type: String, trim: true, default: null },
    coverImageUrl: { type: String, trim: true, default: null },
    branches: [branchSchemaDefinition],
    isDeliveryEnabled: {
        type: Boolean,
        default: false, // Default to disabled? Or true? Your choice.
    },
}, { timestamps: true });


restaurantProfileSchema.pre('save', async function (next) {
    if (this.isModified('name')) {
        try {
            await mongoose.model('User').findByIdAndUpdate(this.restaurant, { restaurantName: this.name });
        } catch (error) {
            console.error("Error syncing restaurant name to user:", error);
            // Decide if this should block the save or just log
        }
    }
    next();
});


const RestaurantProfile = mongoose.model('RestaurantProfile', restaurantProfileSchema);
export default RestaurantProfile;
