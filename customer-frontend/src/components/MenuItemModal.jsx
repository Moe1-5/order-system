// src/components/MenuItemModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiShoppingCart, FiCheckSquare, FiSquare, FiPlusCircle, FiMinusCircle, FiImage } from 'react-icons/fi';

const MenuItemModal = ({ item, isOpen, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    // Initialize selectedComponents with all default components selected
    const [selectedComponents, setSelectedComponents] = useState(
        Array.isArray(item?.components) ? [...item.components] : []
    );
    const [selectedExtras, setSelectedExtras] = useState([]); // Array of extra objects { name, price }

    // Reset state when item changes or modal opens/closes
    useEffect(() => {
        if (isOpen && item) {
            setQuantity(1);
            setSelectedComponents(Array.isArray(item.components) ? [...item.components] : []);
            setSelectedExtras([]);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleComponentToggle = (componentName) => {
        setSelectedComponents(prev =>
            prev.includes(componentName)
                ? prev.filter(c => c !== componentName)
                : [...prev, componentName]
        );
    };

    const handleExtraToggle = (extra) => {
        setSelectedExtras(prev =>
            prev.some(e => e.name === extra.name)
                ? prev.filter(e => e.name !== extra.name)
                : [...prev, extra]
        );
    };

    const calculateTotalPrice = () => {
        let currentPrice = item.price * quantity;
        selectedExtras.forEach(extra => {
            currentPrice += extra.price * quantity;
        });
        return currentPrice;
    };

    const handleAddToCartClick = () => {
        onAddToCart({
            ...item, // Base menu item data
            quantity,
            selectedComponents,
            selectedExtras,
            finalPricePerItem: calculateTotalPrice() / quantity // Price of one customized item
        });
        onClose(); // Close modal after adding to cart
    };

    const modalVariants = { /* ... (copy from your existing Menu.jsx or define new) ... */
        hidden: { scale: 0.9, opacity: 0, y: 30 },
        visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { scale: 0.9, opacity: 0, y: 30, transition: { duration: 0.2 } }
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={onClose} // Close on backdrop click
                >
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()} // Prevent close on modal content click
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">{item.name}</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full focus:outline-none">
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="p-5 overflow-y-auto space-y-5">
                            {/* Image and Description */}
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-3">
                                <div className="w-full sm:w-1/3 h-32 sm:h-auto bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FiImage size={40} />
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 flex-grow">{item.description || "No description available."}</p>
                            </div>


                            {/* Default Components (Uncheck to remove) */}
                            {item.components && item.components.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-gray-700 mb-2">Includes (uncheck to remove):</h3>
                                    <div className="space-y-1.5">
                                        {item.components.map(component => (
                                            <label key={component} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                    checked={selectedComponents.includes(component)}
                                                    onChange={() => handleComponentToggle(component)}
                                                />
                                                <span className="text-sm text-gray-700">{component}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extras (Check to add) */}
                            {item.extras && item.extras.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-gray-700 mb-2 pt-3 border-t border-gray-200">Add Extras:</h3>
                                    <div className="space-y-1.5">
                                        {item.extras.map(extra => (
                                            <label key={extra.name} className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedExtras.some(e => e.name === extra.name)}
                                                        onChange={() => handleExtraToggle(extra)}
                                                    />
                                                    <span className="text-sm text-gray-700">{extra.name}</span>
                                                </div>
                                                <span className="text-sm text-indigo-600 font-medium">+${extra.price.toFixed(2)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer - Quantity and Add to Cart */}
                        <div className="p-5 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        disabled={quantity <= 1}
                                        className="p-1.5 text-gray-500 hover:text-red-600 disabled:opacity-50 rounded-full hover:bg-red-100"
                                    >
                                        <FiMinusCircle size={22} />
                                    </button>
                                    <span className="mx-3 text-md font-semibold w-8 text-center">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(q => q + 1)}
                                        className="p-1.5 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-100"
                                    >
                                        <FiPlusCircle size={22} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleAddToCartClick}
                                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <FiShoppingCart className="mr-2" />
                                Add to Cart (${calculateTotalPrice().toFixed(2)})
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MenuItemModal;
