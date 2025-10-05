// src/components/FoodCard.jsx

import React from 'react';
import { Star, Plus, Edit3 } from 'lucide-react'; // Import Edit3 for customization icon
import { motion } from 'framer-motion';

// Add `isCustomizable` to props
const FoodCard = ({ item, onClick, onQuickAdd, isCustomizable }) => {
    // ... renderStars function is the same ...

    return (
        <motion.div
            className="bg-white rounded-3xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 relative border border-gray-50 cursor-pointer h-full flex flex-col"
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
        >
            <div className="relative mb-4">
                <div className="relative overflow-hidden rounded-2xl">
                    <img
                        src={item.image || item.imageUrl} // Support both image sources
                        alt={item.name}
                        className="w-full aspect-square object-cover transition-transform duration-300 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
            </div>

            <div className="space-y-2 flex-grow flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{item.name}</h3>
                    <p className="text-xs text-gray-500 font-medium mb-2">{item.category}</p>
                </div>

                {/* NEW: Customizable Tag */}
                {isCustomizable && (
                    <div className="text-xs text-orange-600 font-medium flex items-center">
                        <Edit3 className="w-3 h-3 mr-1" />
                        Customizable
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 mt-auto">
                    <span className="font-black text-gray-900 text-lg">${(item.price || 0).toFixed(2)}</span>
                    <motion.button
                        onClick={onQuickAdd}
                        className="w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={isCustomizable ? "Customize & Add" : "Add to Cart"} // Dynamic title
                    >
                        <Plus className="w-4 h-4 text-white" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default FoodCard;
