// models/Order.js
import mongoose from 'mongoose';
import AutoIncrementFactory from 'mongoose-sequence';

const AutoIncrement = AutoIncrementFactory(mongoose);

const selectedExtraSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtOrder: { type: Number, required: true },
    selectedComponents: {
        type: [String],
        default: []
    },
    selectedExtras: {
        type: [selectedExtraSchema],
        default: []
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
        type: String, required: true,
        enum: ['new', 'processing', 'ready', 'completed', 'cancelled'],
        default: 'new', index: true
    },
    orderType: {
        type: String, required: true,
        enum: ['dine-in', 'pickup'/*, 'delivery'*/],
    },
    tableNumber: { type: Number, default: null, sparse: true },
    customerInfo: {
        name: { type: String, trim: true, required: function () { return this.orderType !== 'dine-in'; } },
        phone: { type: String, trim: true, required: function () { return this.orderType !== 'dine-in'; } },
        email: { type: String, trim: true, lowercase: true },
    },
    notes: { type: String, trim: true },
}, { timestamps: true });

orderSchema.plugin(AutoIncrement, {
    inc_field: 'orderNumber',
    id: 'orderNumsPerRestaurant',
    reference_fields: ['restaurant'],
    start_seq: 1,
});

orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, orderNumber: 1 }, { unique: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
