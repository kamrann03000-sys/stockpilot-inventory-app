/**
 * Validation rules for products, categories, transactions, and inventory operations.
 */

export const validateProduct = (product, existingSkus = []) => {
  const errors = {};

  if (!product.name || !product.name.trim()) {
    errors.name = 'Product name is required';
  }

  if (!product.sku || !product.sku.trim()) {
    errors.sku = 'SKU is required';
  } else {
    const isDuplicate = existingSkus.some(
      s => s.sku?.toLowerCase() === product.sku.trim().toLowerCase() && s.id !== product.id
    );
    if (isDuplicate) {
      errors.sku = 'SKU must be unique';
    }
  }

  if (!product.categoryId) {
    errors.categoryId = 'Category is required';
  }

  const cost = Number(product.costPrice);
  if (isNaN(cost) || cost < 0) {
    errors.costPrice = 'Cost price must be a non-negative number';
  }

  const sell = Number(product.sellingPrice);
  if (isNaN(sell) || sell < 0) {
    errors.sellingPrice = 'Selling price must be a non-negative number';
  }

  const stock = Number(product.stock);
  if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
    errors.stock = 'Stock must be a non-negative whole integer';
  }

  const minStock = Number(product.minStock);
  if (isNaN(minStock) || minStock < 0 || !Number.isInteger(minStock)) {
    errors.minStock = 'Reorder point must be a non-negative whole integer';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateCategory = (category, existingCategories = []) => {
  const errors = {};

  if (!category.name || !category.name.trim()) {
    errors.name = 'Category name is required';
  } else {
    const isDuplicate = existingCategories.some(
      c => c.name.toLowerCase() === category.name.trim().toLowerCase() && c.id !== category.id
    );
    if (isDuplicate) {
      errors.name = 'Category name must be unique';
    }
  }

  if (!category.code || !category.code.trim()) {
    errors.code = 'Category code is required (e.g. ELE, HOM)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
