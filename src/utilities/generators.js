/**
 * Generators for unique IDs, SKUs, and Invoice numbers.
 */

export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

export const generateSKU = (categoryCode = 'GEN', existingSkus = []) => {
  const cleanCode = categoryCode.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3) || 'GEN';
  let counter = 1;
  let skuCandidate = `NVM-${cleanCode}-${String(counter).padStart(3, '0')}`;

  const skuSet = new Set(existingSkus.map(s => String(s).toUpperCase()));
  while (skuSet.has(skuCandidate)) {
    counter++;
    skuCandidate = `NVM-${cleanCode}-${String(counter).padStart(3, '0')}`;
  }

  return skuCandidate;
};

export const generateInvoiceNumber = (existingInvoices = []) => {
  const year = new Date().getFullYear();
  let maxNum = 0;

  const prefix = `INV-${year}-`;
  existingInvoices.forEach(inv => {
    if (inv && typeof inv === 'string' && inv.startsWith(prefix)) {
      const part = parseInt(inv.replace(prefix, ''), 10);
      if (!isNaN(part) && part > maxNum) {
        maxNum = part;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};
