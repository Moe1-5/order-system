import express from 'express';
import { getPublicSiteInfo } from '../controllers/siteInfoController.js'; // Assuming you adapt/create this
import { getPublicMenuItems } from '../controllers/menuController.js';    // Assuming you adapt/create this
import { placeCustomerOrder } from '../controllers/orderController.js';  // Assuming you adapt/create this

const router = express.Router();

// GET Public Restaurant Info (Name, Logo, etc.)
// Uses :restaurantId from the URL directly
router.get('/siteinfo/:restaurantId', getPublicSiteInfo);

// GET Public Menu Items for a specific restaurant
// Uses :restaurantId from the URL directly
router.get('/menu/:restaurantId', getPublicMenuItems);

// POST Place a new customer order
// Body will contain order details (items, table, restaurantId)
router.post('/orders', placeCustomerOrder);

export default router;
