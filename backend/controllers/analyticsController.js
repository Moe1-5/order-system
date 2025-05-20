// backend/controllers/analyticsController.js
import Order from '../models/Order.js';
import MenuItem from '../models/menuItem.js'; // Assuming your model name is menuItem.js -> MenuItem
import mongoose from 'mongoose';

// Helper function to get the start date based on a period
const getStartDateForPeriod = (period = 'week') => {
    const now = new Date();
    let startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0); // Start from beginning of today (UTC)

    switch (period.toLowerCase()) {
        case 'month':
            startDate.setUTCDate(1); // First day of the current month
            break;
        case 'year':
            startDate.setUTCMonth(0, 1); // First day of the current year
            break;
        case 'week':
        default:
            // Go back to the beginning of the week (assuming Sunday=0)
            const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
            startDate.setUTCDate(now.getUTCDate() - dayOfWeek);
            break;
    }
    console.log(`[getStartDateForPeriod] Period: ${period}, Calculated StartDate (UTC): ${startDate.toISOString()}`);
    return startDate;
};

export const getSalesOverTime = async (req, res) => {
    const ownerId = req.userId || "67fd1d97949e2d7dbb5758c0";
    const period = req.query.period || 'week'; // Default to week
    console.log(`\n--- [getSalesOverTime] START ---`);
    console.log(`[getSalesOverTime] User ID: ${ownerId}, Period: ${period}`);

    if (!ownerId) {
        console.error("[getSalesOverTime] Error: User ID not found on request.");
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        // --- Date Range Logic ---
        // Defaulting to last 7 days for 'week' for simplicity here, adjust if needed
        const endDate = new Date(); // Use current time as end
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6); // Get last 7 days including today
        startDate.setUTCHours(0, 0, 0, 0);
        // endDate.setUTCHours(23, 59, 59, 999); // End of current day

        console.log(`[getSalesOverTime] Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        // --- End Date Range Logic ---

        const aggregationPipeline = [
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(ownerId),
                    status: 'completed', // Only completed orders contribute to sales
                    // Decide which date field represents the sale date
                    createdAt: { $gte: startDate, $lte: endDate } // Using createdAt for when order was placed
                    // updatedAt: { $gte: startDate, $lte: endDate } // Alternative: use updatedAt for completion date
                }
            },
            {
                $group: {
                    // Group by day using date string
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, // Using createdAt
                    // _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone:"UTC"} }, // Alternative: using updatedAt
                    dailyRevenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }, // Sort by date string
            {
                $project: {
                    _id: 0,
                    name: '$_id', // Date string becomes 'name'
                    value: '$dailyRevenue' // Revenue becomes 'value'
                }
            }
        ];

        console.log('[getSalesOverTime] Aggregation Pipeline:', JSON.stringify(aggregationPipeline, null, 2));
        const salesResult = await Order.aggregate(aggregationPipeline);
        console.log(`[getSalesOverTime] Aggregation Result (Raw):`, salesResult);

        // TODO: Optionally fill in missing days with value: 0 if needed for chart continuity

        console.log(`[getSalesOverTime] Sending Success Response.`);
        res.status(200).json(salesResult);

    } catch (error) {
        console.error("[getSalesOverTime] CATCH BLOCK ERROR:", error);
        res.status(500).json({ message: "Server error fetching sales data." });
    }
    console.log(`--- [getSalesOverTime] END ---`);
};

export const getOrderCategories = async (req, res) => {
    const ownerId = req.userId;
    const period = req.query.period || 'week';
    console.log(`\n--- [getOrderCategories] START ---`);
    console.log(`[getOrderCategories] User ID: ${ownerId}, Period: ${period}`);

    if (!ownerId) {
        console.error("[getOrderCategories] Error: User ID not found on request.");
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        // --- Date Range Logic ---
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6); // Last 7 days
        startDate.setUTCHours(0, 0, 0, 0);
        // endDate.setUTCHours(23, 59, 59, 999); // End of current day

        console.log(`[getOrderCategories] Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        console.log(`[getOrderCategories] >>>>>>>>> the restaurant ID: ${ownerId}`);

        // --- End Date Range Logic ---

        const aggregationPipeline = [
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(ownerId),
                    createdAt: { $gte: startDate, $lte: endDate } // Filter orders by date
                }
            },
            {
                $unwind: { path: "$items" } // Deconstruct items array
            },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.menuItem", // <<< Requires a 'menuItem' field in Order.items
                    foreignField: "_id",
                    as: "menuItemDetails"
                }
            },
            {
                // Unwind the result, filter out items where lookup failed (optional but safer)
                $unwind: {
                    path: "$menuItemDetails",
                    preserveNullAndEmptyArrays: false // Exclude orders where menuItem wasn't found
                }
            },
            {
                $group: {
                    // Group by the category field from the joined menu item
                    _id: "$menuItemDetails.category", // VERIFIED: Field in MenuItem is 'category'
                    count: { $sum: 1 } // Count number of items in each category
                }
            },
            {
                // Exclude null/missing categories if needed
                $match: {
                    _id: { $ne: null }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id", // Rename category name to 'name'
                    value: "$count" // Rename count to 'value'
                }
            },
            {
                $sort: { "value": -1 } // Sort categories by count descending
            }
        ];

        console.log('[getOrderCategories] Aggregation Pipeline:', JSON.stringify(aggregationPipeline, null, 2));
        const categoryResult = await Order.aggregate(aggregationPipeline);
        console.log(`[getOrderCategories] Aggregation Result (Raw):`, categoryResult);

        console.log(`[getOrderCategories] Sending Success Response.`);
        res.status(200).json(categoryResult); // Send counts

    } catch (error) {
        console.error("[getOrderCategories] CATCH BLOCK ERROR:", error);
        res.status(500).json({ message: "Server error fetching order categories." });
    }
    console.log(`--- [getOrderCategories] END ---`);
};
