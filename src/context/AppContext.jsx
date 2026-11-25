import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { storageService } from '../services/storageService';
import {
  getProductStockStatus,
  STOCK_STATUS,
  calculateInventoryValuation,
  createMovementRecord,
} from '../services/inventoryService';
import { generateInvoiceNumber, generateId } from '../utilities/generators';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Core state loaded from LocalStorage
  const [settings, setSettings] = useState(() => storageService.loadSettings());
  const [categories, setCategories] = useState(() => storageService.loadCategories());
  const [products, setProducts] = useState(() => storageService.loadProducts());
  const [sales, setSales] = useState(() => storageService.loadSales());
  const [movements, setMovements] = useState(() => storageService.loadMovements());
  const [parkedCarts, setParkedCarts] = useState(() => storageService.loadParkedCarts());

  // UI state
  const [toasts, setToasts] = useState([]);

  // Auto-sync state changes to localStorage
  useEffect(() => {
    storageService.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    storageService.saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    storageService.saveProducts(products);
  }, [products]);

  useEffect(() => {
    storageService.saveSales(sales);
  }, [sales]);

  useEffect(() => {
    storageService.saveMovements(movements);
  }, [movements]);

  useEffect(() => {
    storageService.saveParkedCarts(parkedCarts);
  }, [parkedCarts]);

  // Toast Notification helper
  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = generateId('toast');
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- PRODUCT ACTIONS ---
  const addProduct = useCallback((productData) => {
    const id = generateId('prod');
    const newProduct = {
      ...productData,
      id,
      costPrice: Number(productData.costPrice) || 0,
      sellingPrice: Number(productData.sellingPrice) || 0,
      stock: Number(productData.stock) || 0,
      minStock: Number(productData.minStock) || 0,
      maxStock: Number(productData.maxStock) || 0,
      status: productData.status || 'active',
      createdAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);

    // If initial stock > 0, log an initial stock-in movement
    if (newProduct.stock > 0) {
      const movement = createMovementRecord({
        productId: id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'IN',
        quantity: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        reference: 'INITIAL_STOCK',
        reason: 'Initial product stock creation',
        user: 'Store Admin',
      });
      setMovements((prev) => [movement, ...prev]);
    }

    showToast({
      type: 'success',
      title: 'Product Added',
      message: `${newProduct.name} (${newProduct.sku}) was successfully created.`,
    });

    return newProduct;
  }, [showToast]);

  const updateProduct = useCallback((id, updatedData) => {
    let oldProduct = null;
    let modifiedProduct = null;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          oldProduct = p;
          modifiedProduct = {
            ...p,
            ...updatedData,
            costPrice: Number(updatedData.costPrice !== undefined ? updatedData.costPrice : p.costPrice),
            sellingPrice: Number(updatedData.sellingPrice !== undefined ? updatedData.sellingPrice : p.sellingPrice),
            stock: Number(updatedData.stock !== undefined ? updatedData.stock : p.stock),
            minStock: Number(updatedData.minStock !== undefined ? updatedData.minStock : p.minStock),
            maxStock: Number(updatedData.maxStock !== undefined ? updatedData.maxStock : p.maxStock),
            updatedAt: new Date().toISOString(),
          };
          return modifiedProduct;
        }
        return p;
      })
    );

    // If stock changed directly via product edit, record an adjustment movement
    if (oldProduct && modifiedProduct && oldProduct.stock !== modifiedProduct.stock) {
      const diff = modifiedProduct.stock - oldProduct.stock;
      const movement = createMovementRecord({
        productId: id,
        productName: modifiedProduct.name,
        sku: modifiedProduct.sku,
        type: 'ADJUSTMENT',
        quantity: diff,
        previousStock: oldProduct.stock,
        newStock: modifiedProduct.stock,
        reference: 'MANUAL_EDIT',
        reason: 'Stock count updated in product settings',
        user: 'Store Admin',
      });
      setMovements((prev) => [movement, ...prev]);
    }

    showToast({
      type: 'success',
      title: 'Product Updated',
      message: `Changes to ${updatedData.name || oldProduct?.name || 'product'} saved.`,
    });
  }, [showToast]);

  const deleteProduct = useCallback((id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    // Check if sales exist for this product
    const hasSales = sales.some((s) => s.items?.some((i) => i.productId === id));
    if (hasSales) {
      // Archive instead of hard delete to preserve financial integrity
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'archived', updatedAt: new Date().toISOString() } : p))
      );
      showToast({
        type: 'info',
        title: 'Product Archived',
        message: `${product.name} has past sales history and was moved to Archived status.`,
      });
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast({
        type: 'success',
        title: 'Product Deleted',
        message: `${product.name} was removed from the catalog.`,
      });
    }
  }, [products, sales, showToast]);

  // --- CATEGORY ACTIONS ---
  const addCategory = useCallback((catData) => {
    const id = generateId('cat');
    const newCategory = {
      ...catData,
      id,
      itemCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCategory]);
    showToast({
      type: 'success',
      title: 'Category Added',
      message: `Category "${newCategory.name}" created.`,
    });
    return newCategory;
  }, [showToast]);

  const updateCategory = useCallback((id, updatedData) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData, updatedAt: new Date().toISOString() } : c))
    );
    showToast({
      type: 'success',
      title: 'Category Updated',
      message: `Category details updated successfully.`,
    });
  }, [showToast]);

  const deleteCategory = useCallback((id) => {
    const productsInCat = products.filter((p) => p.categoryId === id && p.status !== 'archived');
    if (productsInCat.length > 0) {
      showToast({
        type: 'error',
        title: 'Cannot Delete Category',
        message: `This category has ${productsInCat.length} active product(s). Please reassign them first.`,
      });
      return false;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast({
      type: 'success',
      title: 'Category Deleted',
      message: 'Category removed successfully.',
    });
    return true;
  }, [products, showToast]);

  // --- INVENTORY MOVEMENTS ACTIONS ---
  const recordStockIn = useCallback(({ productId, quantity, supplier = '', reference = '', notes = '', user = 'Store Staff' }) => {
    const qty = Math.max(1, Number(quantity) || 1);
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const previousStock = targetProduct.stock;
    const newStock = previousStock + qty;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    const movement = createMovementRecord({
      productId,
      productName: targetProduct.name,
      sku: targetProduct.sku,
      type: 'IN',
      quantity: qty,
      previousStock,
      newStock,
      reference: reference || `RESTOCK-${supplier ? supplier.substring(0, 8).toUpperCase() : 'SUPPLY'}`,
      reason: notes || `Supplier shipment received from ${supplier || 'Vendor'}`,
      user,
    });

    setMovements((prev) => [movement, ...prev]);

    showToast({
      type: 'success',
      title: 'Stock Received',
      message: `+${qty} units of ${targetProduct.name} added. New stock: ${newStock}.`,
    });
  }, [products, showToast]);

  const recordStockOut = useCallback(({ productId, quantity, reason = 'Damaged / Write-off', reference = '', notes = '', user = 'Store Staff' }) => {
    const qty = Math.max(1, Number(quantity) || 1);
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    if (settings.preventNegativeStock && targetProduct.stock < qty) {
      showToast({
        type: 'error',
        title: 'Insufficient Stock',
        message: `Cannot remove ${qty} units. Current stock is only ${targetProduct.stock}.`,
      });
      return false;
    }

    const previousStock = targetProduct.stock;
    const newStock = Math.max(0, previousStock - qty);

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    const movement = createMovementRecord({
      productId,
      productName: targetProduct.name,
      sku: targetProduct.sku,
      type: 'OUT',
      quantity: -qty,
      previousStock,
      newStock,
      reference: reference || 'DAMAGED_WRITE_OFF',
      reason: notes ? `${reason}: ${notes}` : reason,
      user,
    });

    setMovements((prev) => [movement, ...prev]);

    showToast({
      type: 'warning',
      title: 'Stock Removed',
      message: `-${qty} units removed from ${targetProduct.name}. New stock: ${newStock}.`,
    });
    return true;
  }, [products, settings.preventNegativeStock, showToast]);

  const recordStockAdjustment = useCallback(({ productId, newStockCount, reason = 'Inventory Audit', user = 'Store Staff' }) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const newStock = Math.max(0, Number(newStockCount) || 0);
    const previousStock = targetProduct.stock;
    const diff = newStock - previousStock;

    if (diff === 0) {
      showToast({
        type: 'info',
        title: 'No Change',
        message: 'Physical count matches recorded inventory count.',
      });
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    const movement = createMovementRecord({
      productId,
      productName: targetProduct.name,
      sku: targetProduct.sku,
      type: 'ADJUSTMENT',
      quantity: diff,
      previousStock,
      newStock,
      reference: 'AUDIT_COUNT',
      reason: reason || 'Physical inventory reconciliation',
      user,
    });

    setMovements((prev) => [movement, ...prev]);

    showToast({
      type: 'success',
      title: 'Inventory Reconciled',
      message: `${targetProduct.name} updated from ${previousStock} to ${newStock} (${diff > 0 ? '+' : ''}${diff}).`,
    });
  }, [products, showToast]);

  // --- SALES & POS ACTIONS ---
  const createSale = useCallback((salePayload) => {
    const {
      items,
      customerName = 'Walk-in Customer',
      customerEmail = '',
      customerPhone = '',
      discount = 0,
      subtotal,
      tax,
      total,
      paymentMethod = 'Cash',
      cashTendered = 0,
      changeGiven = 0,
      cashier = 'NovaMart Cashier',
    } = salePayload;

    if (!items || items.length === 0) {
      showToast({ type: 'error', title: 'Empty Cart', message: 'Please add items to cart before completing sale.' });
      return null;
    }

    // Validate inventory availability
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        showToast({ type: 'error', title: 'Invalid Item', message: `Product ${item.name} not found.` });
        return null;
      }
      if (settings.preventNegativeStock && prod.stock < item.quantity) {
        showToast({
          type: 'error',
          title: 'Stock Error',
          message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${item.quantity}.`,
        });
        return null;
      }
    }

    // Generate unique invoice number
    const existingInvoices = sales.map((s) => s.invoiceNumber);
    const invoiceNumber = generateInvoiceNumber(existingInvoices);
    const saleId = generateId('sale');
    const now = new Date().toISOString();

    const newSale = {
      id: saleId,
      invoiceNumber,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      date: now,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        price: Number(i.price),
        quantity: Number(i.quantity),
        subtotal: Number(i.price) * Number(i.quantity),
      })),
      subtotal: Number(subtotal),
      discount: Number(discount),
      tax: Number(tax),
      total: Number(total),
      paymentMethod,
      cashTendered: Number(cashTendered) || 0,
      changeGiven: Number(changeGiven) || 0,
      cashier,
      status: 'Completed',
    };

    // Deduct stock for each item & generate SALE movement records
    const newMovements = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = items.find((i) => i.productId === prod.id);
      if (soldItem) {
        const previousStock = prod.stock;
        const newStock = Math.max(0, previousStock - soldItem.quantity);

        newMovements.push(
          createMovementRecord({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'SALE',
            quantity: -soldItem.quantity,
            previousStock,
            newStock,
            reference: invoiceNumber,
            reason: `Sale ${invoiceNumber} to ${newSale.customerName}`,
            user: cashier,
          })
        );

        return { ...prod, stock: newStock };
      }
      return prod;
    });

    setProducts(updatedProducts);
    setMovements((prev) => [...newMovements, ...prev]);
    setSales((prev) => [newSale, ...prev]);

    showToast({
      type: 'success',
      title: 'Sale Completed',
      message: `Invoice ${invoiceNumber} created for ${settings.currency}${total.toFixed(2)}.`,
    });

    return newSale;
  }, [products, sales, settings.currency, settings.preventNegativeStock, showToast]);

  const refundSale = useCallback((saleId, reason = 'Customer Return') => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    if (sale.status === 'Refunded') {
      showToast({ type: 'warning', title: 'Already Refunded', message: 'This transaction was already refunded.' });
      return;
    }

    // Mark sale as refunded
    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'Refunded', refundedAt: new Date().toISOString(), refundReason: reason } : s))
    );

    // Restock all items back into inventory
    const returnMovements = [];
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const refundedItem = sale.items.find((i) => i.productId === prod.id);
        if (refundedItem) {
          const previousStock = prod.stock;
          const newStock = previousStock + refundedItem.quantity;

          returnMovements.push(
            createMovementRecord({
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              type: 'RETURN',
              quantity: refundedItem.quantity,
              previousStock,
              newStock,
              reference: `REFUND-${sale.invoiceNumber}`,
              reason: `Return/Refund for Invoice ${sale.invoiceNumber}: ${reason}`,
              user: 'Store Admin',
            })
          );

          return { ...prod, stock: newStock };
        }
        return prod;
      })
    );

    setMovements((prev) => [...returnMovements, ...prev]);

    showToast({
      type: 'info',
      title: 'Order Refunded',
      message: `${sale.invoiceNumber} was refunded. Items have been restocked to inventory.`,
    });
  }, [sales, showToast]);

  // --- PARKED POS CARTS ---
  const parkCart = useCallback((cartData) => {
    const id = generateId('parked');
    const parked = {
      ...cartData,
      id,
      parkedAt: new Date().toISOString(),
      label: cartData.customerName || `Draft #${parkedCarts.length + 1}`,
    };
    setParkedCarts((prev) => [parked, ...prev]);
    showToast({
      type: 'info',
      title: 'Cart Parked',
      message: `Sale draft "${parked.label}" saved.`,
    });
    return id;
  }, [parkedCarts.length, showToast]);

  const resumeParkedCart = useCallback((cartId) => {
    const target = parkedCarts.find((c) => c.id === cartId);
    if (!target) return null;
    setParkedCarts((prev) => prev.filter((c) => c.id !== cartId));
    showToast({
      type: 'info',
      title: 'Cart Resumed',
      message: `Restored draft "${target.label}".`,
    });
    return target;
  }, [parkedCarts, showToast]);

  const deleteParkedCart = useCallback((cartId) => {
    setParkedCarts((prev) => prev.filter((c) => c.id !== cartId));
  }, []);

  // --- SETTINGS & BACKUP ACTIONS ---
  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Store configuration updated.',
    });
  }, [showToast]);

  const resetToDemo = useCallback(() => {
    const seed = storageService.resetToSeedData();
    setSettings(seed.settings);
    setCategories(seed.categories);
    setProducts(seed.products);
    setSales(seed.sales);
    setMovements(seed.movements);
    setParkedCarts([]);
    showToast({
      type: 'success',
      title: 'Database Reset',
      message: 'StockPilot was successfully restored to NovaMart sample demo data.',
    });
  }, [showToast]);

  const importBackup = useCallback((jsonString) => {
    const res = storageService.importDatabaseBackup(jsonString);
    if (res.success) {
      setSettings(res.data.settings);
      setCategories(res.data.categories);
      setProducts(res.data.products);
      setSales(res.data.sales);
      setMovements(res.data.movements);
      showToast({
        type: 'success',
        title: 'Backup Restored',
        message: 'Database imported and refreshed successfully.',
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Import Failed',
        message: res.error || 'Invalid backup structure.',
      });
      return false;
    }
  }, [showToast]);

  // --- DERIVED METRICS & KPIS ---
  const kpis = useMemo(() => {
    const completedSales = sales.filter((s) => s.status === 'Completed');
    const totalRevenue = completedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    // Calculate Gross Profit & Cost of Goods Sold (COGS)
    let totalCOGS = 0;
    completedSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.costPrice : 0;
        totalCOGS += cost * item.quantity;
      });
    });

    const grossProfit = Math.max(0, totalRevenue - totalCOGS);
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const valuation = calculateInventoryValuation(products.filter((p) => p.status !== 'archived'));

    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      if (p.status !== 'archived') {
        const status = getProductStockStatus(p);
        if (status === STOCK_STATUS.OUT_OF_STOCK) outOfStockCount++;
        else if (status === STOCK_STATUS.LOW_STOCK) lowStockCount++;
      }
    });

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      profitMargin,
      totalValuationCost: valuation.totalCost,
      totalValuationRetail: valuation.totalRetail,
      totalUnits: valuation.totalUnits,
      lowStockCount,
      outOfStockCount,
      totalOrders: completedSales.length,
      activeProductsCount: products.filter((p) => p.status !== 'archived').length,
    };
  }, [sales, products]);

  const value = {
    settings,
    categories,
    products,
    sales,
    movements,
    parkedCarts,
    toasts,
    kpis,
    // Methods
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    recordStockIn,
    recordStockOut,
    recordStockAdjustment,
    createSale,
    refundSale,
    parkCart,
    resumeParkedCart,
    deleteParkedCart,
    updateSettings,
    resetToDemo,
    importBackup,
    showToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
