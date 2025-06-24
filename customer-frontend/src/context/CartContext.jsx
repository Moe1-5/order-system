import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const localData = localStorage.getItem('scanPlateCart');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Error parsing cart from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('scanPlateCart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Helper to generate vbomizations
    const generateCartItemId = (menuItem, selectedComponents, selectedExtras) => {
        const componentsKey = [...(selectedComponents || [])].sort().join(',');
        const extrasKey = [...(selectedExtras || [])].map(ex => ex.name).sort().join(',');
        // Ensure menuItem._id is accessible
        return `${menuItem?._id}-${componentsKey}-${extrasKey}`;
    };

    const addItem = (itemWithOptions) => { // itemWithOptions includes all item properties, quantity, selectedComponents, selectedExtras, finalPricePerItem
        setCartItems(prevItems => {
            // Destructure quantity and customization details, and rest into menuItem
            const { quantity, selectedComponents, selectedExtras, finalPricePerItem, ...menuItem } = itemWithOptions;

            const cartItemId = generateCartItemId(menuItem, selectedComponents, selectedExtras);

            const existingItem = prevItems.find(item => item.cartId === cartItemId);

            if (existingItem) {
                return prevItems.map(item =>
                    item.cartId === cartItemId
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                return [...prevItems, {
                    cartId: cartItemId, // Unique ID for this specific configuration in the cart
                    menuItem: menuItem, // The base menu item object (now correctly nested)
                    quantity: quantity,
                    selectedComponents: selectedComponents || [],
                    selectedExtras: selectedExtras || [],
                    pricePerItemWithExtras: finalPricePerItem // Price of one unit of this customized item
                }];
            }
        });
    };

    const updateQuantity = (cartId, amount) => { // Use cartId to update
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.cartId === cartId
                    ? { ...item, quantity: Math.max(1, item.quantity + amount) } // Ensure quantity doesn't go below 1
                    : item
            ).filter(item => item.quantity > 0) // Remove if quantity becomes 0 (optional, if Math.max(1,...) is used, this is not needed)
        );
    };

    const removeItem = (cartId) => { // Use cartId to remove
        setCartItems(prevItems => prevItems.filter(item => item.cartId !== cartId));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => {
            // Access pricePerItemWithExtras from the item object
            return total + (item.pricePerItemWithExtras * item.quantity);
        }, 0);
    }, [cartItems]);

    const totalItems = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [cartItems]);

    return (
        <CartContext.Provider value={{ cartItems, addItem, updateQuantity, removeItem, clearCart, subtotal, totalItems }}>
            {children}
        </CartContext.Provider>
    );
};
