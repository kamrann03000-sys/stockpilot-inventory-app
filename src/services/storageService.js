/**
 * LocalStorage Service with Schema Versioning, Backup & Restore, and Seed Reset.
 */

import {
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_MOVEMENTS,
} from '../seed/novamartSeed';

const PREFIX = 'stockpilot_v1_';
const KEYS = {
  SETTINGS: `${PREFIX}settings`,
  CATEGORIES: `${PREFIX}categories`,
  PRODUCTS: `${PREFIX}products`,
  SALES: `${PREFIX}sales`,
  MOVEMENTS: `${PREFIX}movements`,
  PARKED_CARTS: `${PREFIX}parked_carts`,
};

const safeGet = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

export const storageService = {
  // Settings
  loadSettings: () => safeGet(KEYS.SETTINGS, INITIAL_SETTINGS),
  saveSettings: (settings) => safeSet(KEYS.SETTINGS, settings),

  // Categories
  loadCategories: () => safeGet(KEYS.CATEGORIES, INITIAL_CATEGORIES),
  saveCategories: (categories) => safeSet(KEYS.CATEGORIES, categories),

  // Products
  loadProducts: () => safeGet(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  saveProducts: (products) => safeSet(KEYS.PRODUCTS, products),

  // Sales / Orders
  loadSales: () => safeGet(KEYS.SALES, INITIAL_SALES),
  saveSales: (sales) => safeSet(KEYS.SALES, sales),

  // Inventory Movements
  loadMovements: () => safeGet(KEYS.MOVEMENTS, INITIAL_MOVEMENTS),
  saveMovements: (movements) => safeSet(KEYS.MOVEMENTS, movements),

  // Parked POS Carts
  loadParkedCarts: () => safeGet(KEYS.PARKED_CARTS, []),
  saveParkedCarts: (carts) => safeSet(KEYS.PARKED_CARTS, carts),

  // Reset to Demo Seed Data
  resetToSeedData: () => {
    safeSet(KEYS.SETTINGS, INITIAL_SETTINGS);
    safeSet(KEYS.CATEGORIES, INITIAL_CATEGORIES);
    safeSet(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    safeSet(KEYS.SALES, INITIAL_SALES);
    safeSet(KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    safeSet(KEYS.PARKED_CARTS, []);
    return {
      settings: INITIAL_SETTINGS,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      sales: INITIAL_SALES,
      movements: INITIAL_MOVEMENTS,
      parkedCarts: [],
    };
  },

  // Export Complete Database Backup as JSON
  exportDatabaseBackup: () => {
    const backup = {
      app: 'StockPilot',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings: storageService.loadSettings(),
        categories: storageService.loadCategories(),
        products: storageService.loadProducts(),
        sales: storageService.loadSales(),
        movements: storageService.loadMovements(),
      },
    };
    return backup;
  },

  // Import Database Backup
  importDatabaseBackup: (jsonContent) => {
    try {
      const parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      if (!parsed || !parsed.data) {
        throw new Error('Invalid backup file format.');
      }
      const { settings, categories, products, sales, movements } = parsed.data;

      if (settings) safeSet(KEYS.SETTINGS, settings);
      if (Array.isArray(categories)) safeSet(KEYS.CATEGORIES, categories);
      if (Array.isArray(products)) safeSet(KEYS.PRODUCTS, products);
      if (Array.isArray(sales)) safeSet(KEYS.SALES, sales);
      if (Array.isArray(movements)) safeSet(KEYS.MOVEMENTS, movements);

      return {
        success: true,
        data: {
          settings: settings || INITIAL_SETTINGS,
          categories: categories || [],
          products: products || [],
          sales: sales || [],
          movements: movements || [],
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get approximate storage size
  getStorageUsage: () => {
    try {
      let totalBytes = 0;
      for (const k in localStorage) {
        if (k.startsWith(PREFIX)) {
          totalBytes += (localStorage[k].length + k.length) * 2;
        }
      }
      return (totalBytes / 1024).toFixed(2); // In KB
    } catch {
      return '0';
    }
  },
};
