// models/user.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    restaurantName: { type: String, required: true },
    userName: { type: String, required: true },
    mail: { type: String, required: true, unique: true, lowercase: true }, // Ensure lowercase constraint if not already there
    phone: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true },

    stripeCustomerId: {
        type: String,
    },
    stripeSubscriptionId: {
        type: String,
    },
    subscriptionStatus: {
        type: String,
        default: null,
        index: true,
    },
    stripePriceId: { 
        type: String,
    },
    currentPeriodEnd: { 
        type: Number,
    },

}, { timestamps: true }); // Keep timestamps

// Add password methods if they aren't already defined elsewhere
// userSchema.pre('save', async function(next) { ... });
// userSchema.methods.comparePassword = async function(candidatePassword) { ... };


export default mongoose.model("User", userSchema); // Ensure model name matches imports elsewhere
