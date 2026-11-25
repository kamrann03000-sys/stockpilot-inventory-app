/**
 * Domain Service for Sales, POS calculations, and Orders.
 */

export const calculateCartTotals = (items = [], discountPercent = 0, taxRate = 8.0) => {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const discountAmount = Math.max(0, (subtotal * (Number(discountPercent) || 0)) / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * (Number(taxRate) || 0)) / 100;
  const grandTotal = taxableAmount + taxAmount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
};

export const calculateChange = (cashTendered, total) => {
  const tendered = Number(cashTendered) || 0;
  const grandTotal = Number(total) || 0;
  return Math.max(0, Number((tendered - grandTotal).toFixed(2)));
};
