// models/MenuItem.js
import mongoose from 'mongoose';

// Sub-schema for Extras that have a name and price
const extraSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 }
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Menu item name is required.'], trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: [true, 'Menu item price is required.'], min: [0, 'Price cannot be negative.'] }, // Base price of the item
    category: { type: String, required: [true, 'Menu item category is required.'], trim: true, index: true },
    imageUrl: { type: String, trim: true, default: null },

    components: {
        type: [String],
        default: []
    },

    extras: {
        type: [extraSchema],
        default: []
    },

    isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

menuItemSchema.index({ restaurant: 1, category: 1 });
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
