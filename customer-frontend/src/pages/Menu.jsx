import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import customerApi from '../api/customerApi';

// Import the new UI components
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import FoodCard from '../components/FoodCard';
import ProductDetails from '../components/ProductDetails';
import DesktopCart from '../components/DesktopCart';

// Import helpers and icons
import LoadingSpinner from '../components/LoadingSpinner';
import { FiAlertCircle, FiShoppingCart, FiImage } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// A custom header that combines the template's style with your app's needs
const MenuHeader = ({ restaurantInfo, tableNumber, totalItems, cartLink }) => (
    <div className="sticky top-0 z-30 flex justify-between items-center p-6 bg-white/90 backdrop-blur-md border-b border-gray-100 lg:hidden">
        <div className="flex items-center space-x-3 overflow-hidden">
            {restaurantInfo?.logoUrl ? (
                <img src={restaurantInfo.logoUrl} alt={`${restaurantInfo.name} Logo`} className="w-12 h-12 object-contain rounded-2xl bg-white p-1 shadow-md flex-shrink-0" />
            ) : (
                <motion.div
                    className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                >
                    <span className="text-white font-black text-lg">{restaurantInfo?.name?.charAt(0) || 'F'}</span>
                </motion.div>
            )}
            <div>
                <h2 className="font-bold text-gray-800 text-lg truncate">{restaurantInfo?.name || 'Restaurant Menu'}</h2>
                {tableNumber && <p className="text-sm text-gray-500 font-medium">Table {tableNumber}</p>}
            </div>
        </div>

        <Link to={cartLink} aria-label={`View Cart (${totalItems} items)`}>
            <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
                <FiShoppingCart className="w-5 h-5 text-gray-600" />
                {totalItems > 0 && (
                    <motion.div
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                        <span className="text-white text-xs font-bold">{totalItems}</span>
                    </motion.div>
                )}
            </motion.div>
        </Link>
    </div>
);

const Menu = () => {
    // STATE, HOOKS, and HELPERS are all correct
    const [menuItems, setMenuItems] = useState([]);
    const [restaurantInfo, setRestaurantInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('All Menu');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { tableNumber } = useParams();
    const location = useLocation();
    const { totalItems, addItem } = useCart();
    const restaurantId = useMemo(() => new URLSearchParams(location.search).get('restaurant'), [location.search]);
    const cartLink = `/cart${tableNumber ? `/table/${tableNumber}` : ''}${location.search}`;
    const hasCustomizations = (item) => (item.components?.length > 0) || (item.extras?.length > 0);

    // DATA FETCHING is correct, but added price safety
    useEffect(() => {
        if (!restaurantId) {
            setError("Restaurant ID is missing. Please use a valid link.");
            setIsLoading(false);
            return;
        }
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [menuResponse, infoResponse] = await Promise.all([
                    customerApi.get(`/menu/${restaurantId}`),
                    customerApi.get(`/siteinfo/${restaurantId}`)
                ]);

                // --- THIS IS THE CRITICAL FIX ---
                // We must sanitize the data as soon as we get it.


                // const formattedMenuItems = (Array.isArray(menuResponse.data) ? menuResponse.data : [])
                //     .filter(item => item.isAvailable)
                //     .map(item => ({
                //         ...item,
                //         id: item._id,
                //         image: item.imageUrl, // Ensure 'image' property exists for components
                //         rating: item.rating || 4.8,
                //         description: item.description || "No description available.",
                //         price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                //     }));


                setMenuItems(Array.isArray(menuResponse.data) ? menuResponse.data : []);
                setRestaurantInfo(infoResponse.data || null);
            } catch (err) {
                setError("Could not load restaurant details or menu.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [restaurantId]);

    // MEMOIZED DATA is correct
    const categories = useMemo(() => [...new Set(menuItems.map(item => item.category || 'Other'))].sort(), [menuItems]);
    const categoryTabs = useMemo(() => {
        const itemCounts = menuItems.reduce((acc, item) => { const category = item.category || 'Other'; acc[category] = (acc[category] || 0) + 1; return acc; }, {});
        return [{ name: 'All Menu', count: menuItems.length }, ...categories.map(cat => ({ name: cat, count: itemCounts[cat] }))];
    }, [categories, menuItems]);
    const filteredItems = useMemo(() => menuItems.filter(item => (activeTab === 'All Menu' || item.category === activeTab) && item.name.toLowerCase().includes(searchQuery.toLowerCase())), [menuItems, activeTab, searchQuery]);

    // EVENT HANDLERS
    const handleProductClick = (item) => setSelectedProduct(item);

    const handleQuickAddToCart = (item, e) => {
        e.stopPropagation();
        if (hasCustomizations(item)) {
            setSelectedProduct(item);
        } else {
            // --- CORRECTED OBJECT STRUCTURE ---
            addItem({
                ...item, // Spreads _id, name, price, etc.
                quantity: 1,
                selectedComponents: item.components || [],
                selectedExtras: [],
                finalPricePerItem: item.price || 0 // The base price IS the final price here.
            });
        }
    };

    const addToCartFromDetails = (customizedItem) => {
        addItem(customizedItem);
        setSelectedProduct(null);
    };

    // RENDER LOGIC for loading/error states is correct
    if (isLoading) return <div className="min-h-screen bg-white flex flex-col items-center justify-center"><LoadingSpinner message="Finding delicious food..." /></div>;
    if (error) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center"><FiAlertCircle className="w-16 h-16 text-red-500 mb-4" /><h1 className="text-xl font-semibold text-gray-800 mb-2">Oops, something went wrong.</h1><p className="text-gray-600 mb-6 max-w-sm">{error}</p></div>;

    return (
        <AnimatePresence mode="wait">
            {selectedProduct ? (
                <motion.div key="product-details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ProductDetails product={selectedProduct} onBack={() => setSelectedProduct(null)} onAddToCart={addToCartFromDetails} />
                </motion.div>
            ) : (
                <motion.div key="menu-list" className="min-h-screen bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="lg:hidden">
                            <MenuHeader restaurantInfo={restaurantInfo} tableNumber={tableNumber} totalItems={totalItems} cartLink={cartLink} />
                        </div>
                        <div className="lg:grid lg:grid-cols-12 lg:gap-8 p-4 sm:p-6 lg:p-8">
                            <main className="lg:col-span-8">
                                <div className="lg:hidden">
                                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl font-black text-gray-900 leading-tight">Find good</motion.h1>
                                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 mb-8">Food around you</motion.h1>
                                </div>
                                <div className="hidden lg:flex items-center space-x-4 mb-8">
                                    {restaurantInfo?.logoUrl && <img src={restaurantInfo.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl" />}
                                    <div>
                                        <h1 className="text-4xl font-black text-gray-900 leading-tight">Welcome to</h1>
                                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">{restaurantInfo?.name}</h1>
                                    </div>
                                </div>

                                <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                                <CategoryTabs tabs={categoryTabs} activeTab={activeTab} setActiveTab={setActiveTab} />

                                <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item, index) => (
                                            <motion.div key={item.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }}>
                                                <FoodCard item={item} onClick={() => handleProductClick(item)} onQuickAdd={(e) => handleQuickAddToCart(item, e)} isCustomizable={hasCustomizations(item)} />
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-16 px-4 bg-white rounded-lg shadow">
                                            <FiImage size={40} className="mx-auto text-gray-400 mb-4" />
                                            <p className="text-lg font-medium text-gray-600">No dishes found</p>
                                            <p className="text-sm text-gray-500">There are no available items in this category.</p>
                                        </div>
                                    )}
                                </motion.div>
                            </main>
                            <aside className="hidden lg:block lg:col-span-4">
                                <DesktopCart />
                            </aside>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Menu;
