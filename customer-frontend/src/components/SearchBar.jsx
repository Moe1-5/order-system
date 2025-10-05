// src/components/SearchBar.jsx

import React from 'react';
import { Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

const SearchBar = ({ searchQuery, setSearchQuery }) => {
    return (
        <motion.div
            className="relative mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center px-5 py-4 hover:shadow-xl transition-shadow duration-300">
                <Search className="w-5 h-5 text-gray-400 mr-4" />
                <input
                    type="text"
                    placeholder="Search your favorite food"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 font-medium" // Added bg-transparent
                />
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="ml-3 p-2 rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 text-white shadow-md hover:shadow-lg transition-shadow"
                >
                    <Filter className="w-4 h-4" />
                </motion.button>
            </div>
        </motion.div>
    );
};

export default SearchBar;
