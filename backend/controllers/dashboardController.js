import Order from '../models/Order.js';
import QRCodeConfig from '../models/QRCodeConfig.js';
import mongoose from 'mongoose'; // Make sure mongoose is imported

export const getDashboardStats = async (req, res) => {
    console.log(`[getDashboardStats] START - User: ${req.userId}`); // Keep logs
    try {
        const ownerId = req.userId;
        if (!ownerId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        // Ensure ownerId is a valid format before casting (optional but safer)
        if (!mongoose.Types.ObjectId.isValid(ownerId)) {
            console.error(`[getDashboardStats] Invalid ownerId format: ${ownerId}`);
            return res.status(400).json({ message: 'Invalid user identifier format.' });
        }
        const restaurantObjectId = new mongoose.Types.ObjectId(ownerId); // Cast ONCE

        // --- Date Setup ---
        const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);
        console.log(`[getDashboardStats] Date Range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

        // --- Query Promises (Use consistent casting) ---

        console.log(`[getDashboardStats] Querying active orders...`);
        const activeOrderCountPromise = Order.countDocuments({
            restaurant: restaurantObjectId, // <<< Use casted ObjectId
            status: { $in: ['new', 'processing', 'ready'] }
        });

        console.log(`[getDashboardStats] Querying completed today...`);
        const completedTodayCountPromise = Order.countDocuments({
            restaurant: restaurantObjectId, // <<< Use casted ObjectId
            status: 'completed',
            updatedAt: { $gte: todayStart, $lte: todayEnd }
        });

        console.log(`[getDashboardStats] Aggregating today's revenue...`);
        const todaysRevenuePromise = Order.aggregate([
            {
                $match: {
                    restaurant: restaurantObjectId, // <<< Use casted ObjectId
                    status: 'completed',
                    updatedAt: { $gte: todayStart, $lte: todayEnd }
                }
            },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        console.log(`[getDashboardStats] Querying QR scans today...`);
        let qrScansTodayCountPromise = Promise.resolve(0);
        if (QRCodeConfig && mongoose.Types.ObjectId.isValid(ownerId)) { // Check model exists and ID is valid
            qrScansTodayCountPromise = QRCodeConfig.countDocuments({
                restaurant: restaurantObjectId, // <<< Use casted ObjectId
                lastScanAt: { $gte: todayStart, $lte: todayEnd }
            });
        } else {
            console.warn("[getDashboardStats] QRCodeConfig model not available or ownerId invalid.");
        }

        // --- Execute Promises ---
        console.log('[getDashboardStats] Awaiting all promises...');
        const [
            activeOrderCount,
            completedTodayCount,
            revenueResult,
            qrScansTodayCount
        ] = await Promise.all([
            activeOrderCountPromise,
            completedTodayCountPromise,
            todaysRevenuePromise,
            qrScansTodayCountPromise
        ]);
        console.log('[getDashboardStats] Promises resolved.');

        const todaysRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        const stats = {
            activeOrders: activeOrderCount,
            completedToday: completedTodayCount,
            todaysRevenue: todaysRevenue,
            qrScansToday: qrScansTodayCount,
        };

        console.log(`[getDashboardStats] Sending final stats:`, stats);
        res.status(200).json(stats);

    } catch (error) {
        // Log the specific error that caused the catch block to run
        console.error("[getDashboardStats] CATCH BLOCK ERROR:", error);
        res.status(500).json({ message: "Server error fetching dashboard statistics." });
    }
    console.log(`--- [getDashboardStats] END ---`);
};
