'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppIdentitySettings, CartItem, Product, CartVariantSelection } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { INITIAL_APP_SETTINGS } from '@/lib/services/mockData';

interface AppContextType {
  settings: AppIdentitySettings;
  cart: CartItem[];
  addToCart: (product: Product, selectedVariants: CartVariantSelection[], quantity?: number) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotalCount: number;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppIdentitySettings>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppIdentitySettings>(INITIAL_APP_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>([]);

  const refreshSettings = async () => {
    const data = await DataService.getAppSettings();
    setSettings(data);
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<AppIdentitySettings>) => {
    const updated = await DataService.updateAppSettings(newSettings);
    setSettings(updated);
  };

  const addToCart = (product: Product, selectedVariants: CartVariantSelection[], quantity: number = 1) => {
    // Generate unique identifier for this product + variant combination
    const variantKey = selectedVariants.map((v) => v.variant_id).sort().join('-');
    const cartItemId = `${product.id}_${variantKey}`;

    const additionalPriceSum = selectedVariants.reduce((sum, v) => sum + v.additional_price, 0);
    const unitPrice = product.base_price + additionalPriceSum;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.cart_item_id === cartItemId);
      if (existingIndex !== -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal: newQty * unitPrice,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            cart_item_id: cartItemId,
            product,
            selected_variants: selectedVariants,
            unit_price: unitPrice,
            quantity,
            subtotal: quantity * unitPrice,
          },
        ];
      }
    });
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.cart_item_id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unit_price,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cart_item_id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        settings,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartTotalCount,
        refreshSettings,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
