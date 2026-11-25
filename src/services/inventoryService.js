/**
 * Domain Service for Inventory calculations and movement logic.
 */

export const STOCK_STATUS = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  HEALTHY: 'HEALTHY',
  OVERSTOCKED: 'OVERSTOCKED',
};

export const getProductStockStatus = (product) => {
  if (!product) return STOCK_STATUS.OUT_OF_STOCK;
  const stock = Number(product.stock) || 0;
  const minStock = Number(product.minStock) || 0;
  const maxStock = Number(product.maxStock) || 0;

  if (stock <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (stock <= minStock) return STOCK_STATUS.LOW_STOCK;
  if (maxStock > 0 && stock > maxStock) return STOCK_STATUS.OVERSTOCKED;
  return STOCK_STATUS.HEALTHY;
};

export const calculateInventoryValuation = (products = []) => {
  let totalCost = 0;
  let totalRetail = 0;
  let totalUnits = 0;

  products.forEach((p) => {
    const qty = Math.max(0, Number(p.stock) || 0);
    const cost = Number(p.costPrice) || 0;
    const sell = Number(p.sellingPrice) || 0;

    totalUnits += qty;
    totalCost += qty * cost;
    totalRetail += qty * sell;
  });

  const potentialProfit = Math.max(0, totalRetail - totalCost);
  const potentialMargin = totalRetail > 0 ? (potentialProfit / totalRetail) * 100 : 0;

  return {
    totalUnits,
    totalCost,
    totalRetail,
    potentialProfit,
    potentialMargin,
  };
};

export const createMovementRecord = ({
  productId,
  productName,
  sku,
  type, // 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN'
  quantity, // positive or negative change
  previousStock,
  newStock,
  reference = '',
  reason = '',
  user = 'Admin',
}) => {
  return {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    productId,
    productName,
    sku,
    type,
    quantity,
    previousStock,
    newStock,
    reference,
    reason,
    user,
    timestamp: new Date().toISOString(),
  };
};
