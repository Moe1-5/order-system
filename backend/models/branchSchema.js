import mongoose from 'mongoose';

const branchSchemaDefinition = new mongoose.Schema({
    // Add an ID managed by MongoDB if needed, or use the one from the frontend if stable
    // frontendId: { type: Number }, // Optional: if you need to track the simple ID from frontend state
    name: {
        type: String,
        required: [true, 'Branch name is required.'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
        default: '',
    },
    phone: {
        type: String,
        trim: true,
        default: '',
    },
    hours: {
        type: String,
        trim: true,
        default: '',
    },
    manager: {
        type: String,
        trim: true,
        default: '',
    },
    active: {
        type: Boolean,
        default: true,
    },
}, { _id: true, timestamps: true });

export default branchSchemaDefinition;
