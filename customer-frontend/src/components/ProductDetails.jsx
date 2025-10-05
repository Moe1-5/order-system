// src/components/ProductDetails.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Star, Plus, Minus, Clock, Flame, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';
const ProductDetails = ({ product, onBack, onAddToCart }) => {
    // State for quantity and customizations
    const [quantity, setQuantity] = useState(1);
    const [selectedComponents, setSelectedComponents] = useState([]);
    const [selectedExtras, setSelectedExtras] = useState([]);

    useEffect(() => {
        if (product) {
            setQuantity(1);
            setSelectedComponents(Array.isArray(product.components) ? [...product.components] : []);
            setSelectedExtras([]);
        }
    }, [product]);

    const handleComponentToggle = (componentName) => {
        setSelectedComponents(prev =>
            prev.includes(componentName) ? prev.filter(c => c !== componentName) : [...prev, componentName]
        );
    };

    const handleExtraToggle = (extra) => {
        setSelectedExtras(prev =>
            prev.some(e => e.name === extra.name) ? prev.filter(e => e.name !== extra.name) : [...prev, extra]
        );
    };

    const finalPricePerItem = useMemo(() => {
        let price = product.price || 0;
        selectedExtras.forEach(extra => {
            price += (extra.price || 0);
        });
        return price;
    }, [product.price, selectedExtras]);


    const totalCalculatedPrice = useMemo(() => finalPricePerItem * quantity, [finalPricePerItem, quantity]);

    const handleAddToCartClick = () => {
        const customizedItem = {
            ...product, // The cart expects the full item here
            quantity,
            selectedComponents,
            selectedExtras,
            pricePerItemWithExtras: finalPricePerItem, // The final, calculated price for one item
            cartId: `${product.id}-${Date.now()}` // Create a unique ID for this cart entry
        };
        onAddToCart(customizedItem);
    };

    const adjustQuantity = (change) => {
        const newQuantity = quantity + change;
        if (newQuantity >= 1) setQuantity(newQuantity);
    };

    const renderStars = (rating) => { /* ... same as before ... */ };

    const CustomizationOption = ({ label, isChecked, onToggle, price }) => (
        <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-orange-50 transition-colors">
            <div className="flex items-center space-x-3">
                <div onClick={onToggle} className="text-orange-500">
                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>
                <span className="text-gray-700 font-medium">{label}</span>
            </div>
            {price !== undefined && (
                <span className="text-sm text-gray-600 font-semibold select-none">+${(price || 0).toFixed(2)}</span>
            )}
        </label>
    );

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto p-4 md:p-8">
                <motion.button
                    onClick={onBack}
                    className="mb-6 flex items-center space-x-2 text-gray-500 hover:text-gray-900 font-semibold"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Menu</span>
                </motion.button>

                <div className="md:grid md:grid-cols-2 md:gap-12 lg:gap-16">
                    {/* Left Column: Image */}
                    <div className="md:sticky top-8 self-start">
                        <motion.img
                            src={product.image || product.imageUrl}
                            alt={product.name}
                            className="w-full h-auto object-cover rounded-3xl shadow-xl"
                            layoutId={`product-image-${product.id}`}
                        />
                    </div>

                    {/* Right Column: Details */}
                    <div className="mt-8 md:mt-0">
                        <motion.div
                            className="space-y-6"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <div>
                                <p className="text-orange-500 font-semibold mb-2">{product.category}</p>
                                <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-3">{product.name}</h1>
                                {renderStars(product.rating)}
                            </div>

                            {product.description && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-600 leading-relaxed">{product.description}</p>
                                </div>
                            )}

                            {/* --- FULL CUSTOMIZATION SECTIONS --- */}
                            {product.components && product.components.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Standard Ingredients</h3>
                                    <div className="space-y-1 bg-gray-50 p-2 rounded-2xl">
                                        {product.components.map(component => (
                                            <CustomizationOption
                                                key={component}
                                                label={component}
                                                isChecked={selectedComponents.includes(component)}
                                                onToggle={() => handleComponentToggle(component)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.extras && product.extras.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Add Extras</h3>
                                    <div className="space-y-1 bg-gray-50 p-2 rounded-2xl">
                                        {product.extras.map(extra => (
                                            <CustomizationOption
                                                key={extra.name}
                                                label={extra.name}
                                                isChecked={selectedExtras.some(e => e.name === extra.name)}
                                                onToggle={() => handleExtraToggle(extra)}
                                                price={extra.price}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* --- END OF CUSTOMIZATION SECTIONS --- */}

                            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Quantity</p>
                                    <div className="flex items-center space-x-3">
                                        <motion.button onClick={() => adjustQuantity(-1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md disabled:opacity-50" whileTap={{ scale: 0.9 }} disabled={quantity <= 1}>
                                            <Minus className="w-4 h-4 text-gray-600" />
                                        </motion.button>
                                        <span className="font-bold text-lg text-gray-900 w-8 text-center">{quantity}</span>
                                        <motion.button onClick={() => adjustQuantity(1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md" whileTap={{ scale: 0.9 }}>
                                            <Plus className="w-4 h-4 text-gray-600" />
                                        </motion.button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 mb-1">Total Price</p>
                                    <p className="text-3xl font-black text-gray-900">${totalCalculatedPrice.toFixed(2)}</p>
                                </div>
                            </div>

                            <motion.button onClick={handleAddToCartClick} className="w-full bg-gradient-to-r from-orange-400 to-yellow-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Plus className="inline w-5 h-5 mr-2" /> Add to Cart
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
