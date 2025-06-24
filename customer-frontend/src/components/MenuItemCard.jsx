// src/components/MenuItemCard.jsx
import React, { useState } from 'react'; // Added useState
import { FiImage, FiPlusCircle, FiAlertTriangle, FiTag } from 'react-icons/fi';
// import { useCart } from '../context/CartContext'; // We'll handle add to cart via modal
import MenuItemModal from './MenuItemModal'; // Import the new modal

const MenuItemCard = ({ item, restaurantId, tableNumber, onAddToCart }) => {
    // const { addItem } = useCart(); // We won't use addItem directly here anymore
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Function to be passed to the modal for adding to cart
    // This will be defined in MenuPage.jsx and passed down if CartContext needs to be called there
    // For now, we'll assume CartContext is imported and used in the modal or MenuPage.
    // Let's assume onAddToCart is passed down from MenuPage where CartContext is available
    // const { addItem } = useCart(); // We need addItem from context for the modal

    const handleOpenModal = () => {
        if (item.isAvailable) {
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    // The onAddToCart function will be passed from MenuPage to MenuItemModal
    // So, MenuItemCard itself doesn't need to know about CartContext directly
    // if MenuPage handles the modal trigger and passing the addItem function.

    if (!item) return null;

    const hasCustomizations = (item.components && item.components.length > 0) || (item.extras && item.extras.length > 0);

    return (
        <>
            <article
                className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col transition-all duration-200 hover:shadow-xl ${!item.isAvailable ? 'opacity-60' : 'cursor-pointer'}`}
                onClick={item.isAvailable ? handleOpenModal : undefined} // Open modal only if available
                title={item.isAvailable ? `Customize and add ${item.name} to cart` : `${item.name} is currently unavailable`}
            >
                {/* Image */}
                <div className="h-40 w-full bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden relative">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <FiImage size={48} />
                    )}
                    {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                            <FiAlertTriangle className="text-yellow-400 h-8 w-8 mb-1" />
                            <span className="text-white text-sm font-semibold drop-shadow">Unavailable</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate">{item.name}</h3>
                    <p className="text-xs text-gray-500 mb-2 flex items-center">
                        <FiTag className="mr-1 h-3 w-3" /> {item.category || 'Uncategorized'}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2 flex-grow mb-3">{item.description || 'No description available.'}</p>

                    {/* Price and Add Button */}
                    <div className="mt-auto flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-xl font-bold text-indigo-600">${item.price.toFixed(2)}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent modal from opening if button itself is clicked
                                if (item.isAvailable) handleOpenModal();
                            }}
                            disabled={!item.isAvailable}
                            className={`p-2 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 ${item.isAvailable ? 'text-indigo-600 hover:bg-indigo-100' : 'text-gray-400 cursor-not-allowed'}`}
                            aria-label={item.isAvailable ? `Add ${item.name} to cart` : `${item.name} is unavailable`}
                        >
                            <FiPlusCircle size={26} />
                        </button>
                    </div>
                    {hasCustomizations && item.isAvailable && (
                        <p className="text-xs text-center text-indigo-500 mt-1">Customizable</p>
                    )}
                </div>
            </article>
            <MenuItemModal
                item={item}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddToCart={onAddToCart} // Pass the onAddToCart prop down to the modal
            />
        </>
    );
};

export default MenuItemCard;
