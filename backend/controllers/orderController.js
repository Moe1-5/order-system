// controllers/orderController.js
import Order from '../models/Order.js'; // Adjust path
import MenuItem from '../models/menuItem.js'; // Need MenuItem to validate price maybe
import mongoose from 'mongoose';
import { io } from "../server.js"

// TODO: Placeholder for WebSocket emission (requires setup)
const emitNewOrderEvent = (restaurantId, orderData) => {
    const room = `restaurant_${restaurantId}`;
    console.log(`[emitNewOrderEvent] Attempting to emit 'new_order' to room: ${room}`);
    if (io) { // Check if io is initialized
        console.log(`[emitNewOrderEvent] io instance FOUND. Emitting...`);
        io.to(room).emit('new_order', orderData);
        console.log(`[emitNewOrderEvent] Emission command sent for order #${orderData.orderNumber}.`);
    } else {
        console.warn("[emitNewOrderEvent] XXX Socket.IO instance (io) NOT FOUND. Cannot emit 'new_order'.");
    }
}

// Helper function to define allowed status transitions
const getAllowedTransitions = (currentStatus) => {
    const transitions = {
        'new': ['processing', 'cancelled'],
        'processing': ['ready', 'cancelled'],
        'ready': ['completed'],
        'completed': [], // Terminal state
        'cancelled': []  // Terminal state
    };
    return transitions[currentStatus] || [];
};

export const getOrders = async (req, res) => {
    try {
        const { status, search, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const filter = { restaurant: req.userId };

        if (status) filter.status = status;

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            // Search across multiple relevant fields
            filter.$or = [
                { orderNumber: searchRegex },
                { 'customerInfo.name': searchRegex },
                { 'customerInfo.phone': searchRegex }, // Basic phone search, might need refinement
                // Add search by table number if search term is a number
                ...(!isNaN(search) ? [{ tableNumber: Number(search) }] : [])
            ];
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                const dateStart = new Date(startDate);
                dateStart.setUTCHours(0, 0, 0, 0); // Use UTC for consistency
                filter.createdAt.$gte = dateStart;
            }
            if (endDate) {
                const dateEnd = new Date(endDate);
                dateEnd.setUTCHours(23, 59, 59, 999); // Use UTC
                filter.createdAt.$lte = dateEnd;
            }
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const orders = await Order.find(filter)
            .sort(sortOptions)
            .limit(100); // Add a sensible limit to prevent fetching huge amounts of data

        res.status(200).json(orders);

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Server error fetching orders.' });
    }
};

export const getOrderById = async (req, res) => { /* ... no changes needed ... */ };

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: newStatus } = req.body; // The target status

        // --- Backend Validation ---
        const validStatuses = ['new', 'processing', 'ready', 'completed', 'cancelled'];
        if (!newStatus || !validStatuses.includes(newStatus)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid Order ID.' });
        }

        // Find the order *first* to check current status
        const order = await Order.findOne({ _id: id, restaurant: req.userId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found or not authorized.' });
        }

        // --- Enforce Status Transition Logic ---
        const allowedNextStatuses = getAllowedTransitions(order.status);
        if (!allowedNextStatuses.includes(newStatus)) {
            return res.status(400).json({
                message: `Invalid status transition from '${order.status}' to '${newStatus}'. Allowed: [${allowedNextStatuses.join(', ')}]`
            });
        }
        // --- End Status Transition Logic ---


        // If transition is valid, update the order
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: id, restaurant: req.userId }, // Ensure owner match again
            { $set: { status: newStatus } },
            { new: true }
        );

        // Note: updatedOrder should not be null here because we found it above,
        // but an extra check could be added if needed.

        // TODO: Add notifications or other side effects here if necessary

        res.status(200).json(updatedOrder);

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server error updating order status.' });
    }
};


export const placeCustomerOrder = async (req, res) => {
    console.log(`[${new Date().toISOString()}] RECEIVED POST /api/public/orders - Body:`, JSON.stringify(req.body));
    try {
        // Destructure all potential fields from the request body
        const {
            restaurantId, items, tableNumber,
            customerName, customerPhone, customerEmail, customerAddress, // Added email/address
            notes // Renamed from customerNotes for consistency
        } = req.body;

        // --- Basic Validation ---
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Valid Restaurant ID is required.' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must contain at least one item.' });
        }

        let parsedTableNumber = null;
        let orderType = 'pickup'; // Default to pickup if no table number

        // Determine Order Type and Validate Table Number
        if (tableNumber !== undefined && tableNumber !== null && tableNumber !== '') {
            parsedTableNumber = parseInt(tableNumber);
            if (isNaN(parsedTableNumber) || parsedTableNumber < 0) {
                return res.status(400).json({ message: 'Table number must be a valid non-negative integer.' });
            }
            orderType = 'dine-in';
        } else {
            // For pickup/delivery (currently just treating non-table as pickup), name and phone are required by schema
            if (!customerName || !customerPhone) {
                // Schema validation should catch this, but good to have an early exit
                return res.status(400).json({ message: 'Name and Phone number are required for pickup/delivery orders.' });
            }
            // Future: Check for address if implementing delivery type selection
            if (!/^\+?[0-9\s\-()]{7,}$/.test(customerPhone)) {
                return res.status(400).json({ message: 'Please provide a valid Phone Number.' });
            }
        }

        // --- Validate Items & Calculate Total ---
        let calculatedTotal = 0;
        const validatedItems = [];
        for (const item of items) {
            if (!item.menuItemId || !mongoose.Types.ObjectId.isValid(item.menuItemId) || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ message: `Invalid data for an item in the order.` });
            }
            const menuItem = await MenuItem.findOne({ _id: item.menuItemId, restaurant: restaurantId, isAvailable: true });
            if (!menuItem) {
                // Try to get name from request for better error message
                const requestedItemName = items.find(i => i.menuItemId === item.menuItemId)?.name || item.menuItemId;
                return res.status(400).json({ message: `Item "${requestedItemName}" is currently unavailable or does not exist.` });
            }
            validatedItems.push({
                menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: item.quantity,
            });
            calculatedTotal += menuItem.price * item.quantity;
        }

        console.log(`[${new Date().toISOString()}] Calculated Total: ${calculatedTotal}, Items Validated: ${validatedItems.length}`);

        // --- Create and Save Order ---
        const newOrder = new Order({
            restaurant: restaurantId, // Changed from 'owner' to match schema
            items: validatedItems,
            tableNumber: parsedTableNumber,
            totalAmount: calculatedTotal, // Use server-calculated total
            status: 'new', // Start as 'new'
            orderType: orderType, // Set based on tableNumber presence
            customerInfo: {
                name: customerName ? customerName.trim() : undefined,
                phone: customerPhone ? customerPhone.trim() : undefined,
                email: customerEmail ? customerEmail.trim().toLowerCase() : undefined, // Add email
                address: customerAddress ? customerAddress.trim() : undefined // Add address (for future delivery)
            },
            notes: notes ? notes.trim() : undefined, // Use 'notes' from destructuring
        });

        console.log(`[${new Date().toISOString()}] Attempting to save order for Restaurant ID: ${restaurantId}`);

        const savedOrder = await newOrder.save(); // Mongoose-sequence adds 'orderNumber' here

        console.log(`[${new Date().toISOString()}] >>> Order SAVED successfully! Order ID: ${savedOrder._id}, Order #: ${savedOrder.orderNumber}`);
        // --- Trigger Real-time Notification ---
        emitNewOrderEvent(restaurantId.toString(), savedOrder.toObject());

        console.log(`[${new Date().toISOString()}] Calling emitNewOrderEvent for Resto ID: ${restaurantId.toString()}`);

        console.log(`[${new Date().toISOString()}] New order ${savedOrder._id} (Num: ${savedOrder.orderNumber}) placed for restaurant ${restaurantId}`);
        res.status(201).json({
            message: 'Order placed successfully!',
            orderId: savedOrder._id,
            orderNumber: savedOrder.orderNumber // Return the generated order number
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] XXX Error in placeCustomerOrder:`, error.message, error.stack);
        if (error.code === 11000 && error.keyPattern && error.keyPattern.orderNumber) {
            return res.status(500).json({ message: 'Error generating unique order number. Please try placing the order again.' });
        }
        if (error instanceof mongoose.Error.ValidationError) {
            // Extract specific validation messages
            const errors = {};
            for (let field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({ message: 'Validation failed. Please check your input.', errors: errors });
        }
        res.status(500).json({ message: 'Server error placing order. Please try again later.' });
    }
};
