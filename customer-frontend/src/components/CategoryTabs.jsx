// src/components/CategoryTabs.jsx

import React from 'react';
import { motion } from 'framer-motion';

// Receive `tabs` as a prop
const CategoryTabs = ({ tabs, activeTab, setActiveTab }) => {
    // The hardcoded tabs array is no longer needed here

    return (
        // This outer div creates a fade-out effect on mobile
        <div className="relative">
            <motion.div
                className="flex items-center space-x-3 mb-6 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:justify-center md:gap-3 md:space-x-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                {tabs.map((tab, index) => (
                    <motion.button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`relative px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${activeTab === tab.name
                            ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-white shadow-lg'
                            : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-orange-200 shadow-sm'
                            }`}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                        <span>{tab.name}</span>
                        {activeTab === tab.name && tab.count > 0 && (
                            <motion.div
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                                <span className="text-white text-xs font-bold">{tab.count}</span>
                            </motion.div>
                        )}
                    </motion.button>
                ))}
            </motion.div>
            {/* This gradient disappears on medium screens and up, providing a scroll hint on mobile */}
            <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden" />
        </div>
    );
};

export default CategoryTabs;
