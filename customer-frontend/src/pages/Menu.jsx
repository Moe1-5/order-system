// src/pages/MenuPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
// Removed axios import if not used directly here
import { useCart } from '../context/CartContext'; // Ensure CartContext provides addItem
import MenuItemCard from '../components/MenuItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
// import ErrorMessage from '../components/ErrorMessage'; // Keep if used for page-level errors
import { FiImage, FiShoppingCart, FiAlertCircle, FiX, FiGift } from 'react-icons/fi';
import CompanyLogoPlaceholder from '../components/CompanyLogo';
import customerApi from '../api/customerApi'; // Assuming you created this separate instance

const generateId = (text) => text.toLowerCase().replace(/\s+/g, '-');

const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [restaurantInfo, setRestaurantInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');

    const { tableNumber } = useParams();
    const location = useLocation();
    const restaurantId = useMemo(() => new URLSearchParams(location.search).get('restaurant'), [location.search]);
    const { totalItems, addItem } = useCart(); // Get addItem from CartContext

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
                setMenuItems(Array.isArray(menuResponse.data) ? menuResponse.data : []);
                setRestaurantInfo(infoResponse.data || null);
            } catch (err) {
                // ... (existing error handling) ...
                console.error("Error fetching menu/info:", err.response?.data || err.message, err);
                let specificError = err.response?.data?.message || "Could not load restaurant details or menu.";
                if (err.response?.status === 404) {
                    setError(`Oops! We couldn't find the restaurant or menu. Maybe check the link or QR code?`);
                } else if (err.code === 'ERR_NETWORK') {
                    setError("Can't connect. Please check your internet and try again.");
                } else {
                    setError(`Something went wrong: ${specificError}`);
                }
                setMenuItems([]);
                setRestaurantInfo(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [restaurantId]);

    const groupedMenu = useMemo(() => (Array.isArray(menuItems) ? menuItems : []).reduce((acc, item) => {
        const category = item.category || 'Other Dishes';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {}), [menuItems]);

    const categories = useMemo(() => Object.keys(groupedMenu).sort(), [groupedMenu]);
    const cartLink = `/cart${tableNumber ? `/table/${tableNumber}` : ''}${location.search}`;
    const promotion = restaurantInfo?.promotion;

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner message="Loading Menu..." /></div>;
    }
    // More robust error display if critical data is missing
    if (error && (!restaurantInfo || !Array.isArray(menuItems) || menuItems.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <FiAlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-xl font-semibold text-red-700 mb-2">Loading Failed</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()} // Simple refresh
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 md:bg-gray-100 font-sans">
            {/* ... (Navbar, Hero Section, Promotion Section - same as before) ... */}
            <nav className="bg-white shadow-sm sticky top-0 z-30 px-4 py-2 border-b border-gray-200">
                {/* ... Navbar content ... */}
                <div className="container mx-auto flex justify-between items-center h-14">
                    <Link to={`/${location.search}`} className="flex items-center space-x-2 text-indigo-600 flex-shrink-0 mr-4">
                        <CompanyLogoPlaceholder className="h-9 w-auto" />
                        <span className="font-bold text-xl hidden sm:inline tracking-tight">ScanPlate</span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-2 overflow-hidden text-center">
                        {restaurantInfo?.logoUrl ? (
                            <img src={restaurantInfo.logoUrl} alt={`${restaurantInfo.name} Logo`} className="h-8 w-8 object-contain rounded-sm flex-shrink-0" />
                        ) : (<div className="h-8 w-8 bg-gray-200 rounded-sm flex items-center justify-center text-gray-400 flex-shrink-0"><FiImage size={16} /></div>)}
                        <span className="font-semibold text-gray-700 text-base truncate">
                            {restaurantInfo?.name || 'Restaurant Menu'}
                        </span>
                        {tableNumber && <span className="text-sm font-medium text-gray-500 whitespace-nowrap">(Table {tableNumber})</span>}
                    </div>
                    <Link
                        to={cartLink}
                        className="relative p-2 text-gray-600 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full"
                        aria-label={`View Cart (${totalItems} items)`}
                    >
                        <FiShoppingCart size={26} />
                        {totalItems > 0 && (
                            <span className="absolute top-0 right-0 block h-4 w-4 transform translate-x-1/2 -translate-y-1/2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 items-center justify-center text-xs font-bold text-white">
                                    {totalItems}
                                </span>
                            </span>
                        )}
                    </Link>
                </div>
            </nav>

            <section className="mb-6 md:mb-8">
                {restaurantInfo?.coverImageUrl ? (
                    <div className="w-full h-48 md:h-56 lg:h-64 bg-gray-300"> <img src={restaurantInfo.coverImageUrl} alt={`${restaurantInfo.name || 'Restaurant'} dining experience`} className="w-full h-full object-cover" /> </div>
                ) : (
                    <div className="w-full h-48 md:h-56 lg:h-64 bg-gradient-to-br from-yellow-400 to-amber-500 flex flex-col items-center justify-center text-center p-6 text-white relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 text-5xl md:text-6xl lg:text-7xl pointer-events-none grid grid-cols-4 gap-4 place-content-center"> <span>🍕</span><span>🍔</span><span>🥗</span><span>🌮</span> <span>🍜</span><span>🍣</span><span>🍩</span><span>🍦</span> <span>🍰</span><span>🍹</span><span>☕</span><span>🥐</span> </div>
                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}> {restaurantInfo?.name ? `Welcome to ${restaurantInfo.name}!` : 'Explore Our Menu!'} </h1>
                            <p className="text-lg md:text-xl font-medium opacity-90" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.4)' }}> Ready to discover your next favorite dish? 🍽️ </p>
                            {tableNumber && <p className="mt-2 px-3 py-1 inline-block bg-black bg-opacity-20 rounded-full text-sm font-semibold">Dining at Table {tableNumber}</p>}
                        </div>
                    </div>
                )}
            </section>


            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                {promotion && promotion.active && (
                    <section className="mb-8 md:mb-10"> {/* ... Promotion Section ... */} </section>
                )}

                {error && restaurantInfo && ( /* ... Error Display ... */
                    <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-md flex items-center justify-between space-x-2 shadow-sm" role="alert">
                        <div className="flex items-center space-x-3"> <FiAlertCircle className="h-6 w-6 flex-shrink-0" /> <span>{error}</span> </div>
                        <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 focus:outline-none p-1 -m-1 rounded-full hover:bg-red-200"> <FiX className="h-5 w-5" /> </button>
                    </div>
                )}

                {categories.length > 1 && ( /* ... Categories Navbar ... */
                    <nav className="sticky top-[64px] md:top-[68px] z-20 bg-white bg-opacity-95 backdrop-blur-sm shadow-sm rounded-lg mb-6 -mx-1 sm:mx-0 overflow-hidden">
                        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto whitespace-nowrap px-3 py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <a href="#menu-all" onClick={() => setActiveCategory('all')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${activeCategory === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`} > All Items </a>
                            {categories.map(category => {
                                const categoryId = generateId(category);
                                return (
                                    <a key={category} href={`#${categoryId}`} onClick={() => setActiveCategory(categoryId)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${activeCategory === categoryId ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`} > {category} </a>
                                );
                            })}
                        </div>
                    </nav>
                )}

                <div id="menu-all">
                    {categories.length === 0 && !isLoading && ( /* ... Empty Menu Message ... */
                        <div className="text-center py-12 px-4 bg-white rounded-lg shadow"> <FiImage size={48} className="mx-auto text-gray-400 mb-4" /> <p className="text-lg font-medium text-gray-600">The menu seems empty right now.</p> <p className="text-sm text-gray-500">Check back soon for delicious updates!</p> </div>
                    )}
                    {categories.map(category => (
                        <section key={category} id={generateId(category)} className="mb-10 md:mb-12 scroll-mt-[130px] md:scroll-mt-[140px]">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-5 flex items-center">
                                {category}
                                <span className="ml-4 flex-grow h-px bg-gradient-to-r from-gray-300 via-gray-200 to-transparent"></span>
                            </h2>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
                                {groupedMenu[category].map(item => (
                                    <MenuItemCard
                                        key={item._id}
                                        item={item}
                                        restaurantId={restaurantId}
                                        tableNumber={tableNumber}
                                        onAddToCart={addItem}
                                    // Pass the addItem function from CartContext to be used by the modal
                                    // The modal will be rendered by MenuItemCard
                                    // onAddToCart will be called by MenuItemModal
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>
            {/* ... (Footer remains the same) ... */}
            <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-white md:bg-transparent mt-auto">
                Powered by Smart Swipe | {restaurantInfo?.name || 'Your Restaurant'} © {new Date().getFullYear()}
            </footer>
        </div>
    );
};

export default Menu;
