import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { StockBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatPercent, formatDate } from '../utilities/formatters';
import { generateSKU } from '../utilities/generators';
import { validateProduct } from '../utilities/validators';
import { exportToCSV } from '../utilities/csv';
import {
  Plus,
  Download,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  Package,
  Layers,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react';

export const ProductsPage = () => {
  const { products, categories, sales, movements, settings, addProduct, updateProduct, deleteProduct } = useApp();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL | IN_STOCK | LOW_STOCK | OUT_OF_STOCK

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minStock: 10,
    maxStock: 100,
    unit: 'pcs',
    barcode: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Reset & prepare Add form
  const handleOpenAddModal = () => {
    const defaultCat = categories[0]?.id || '';
    const defaultCode = categories[0]?.code || 'GEN';
    const newSku = generateSKU(defaultCode, products.map((p) => p.sku));

    setFormData({
      name: '',
      sku: newSku,
      categoryId: defaultCat,
      costPrice: '',
      sellingPrice: '',
      stock: '',
      minStock: settings.defaultMinStock || 10,
      maxStock: 100,
      unit: 'pcs',
      barcode: '',
      description: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Prepare Edit form
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      unit: product.unit || 'pcs',
      barcode: product.barcode || '',
      description: product.description || '',
    });
    setFormErrors({});
  };

  // Auto generate SKU based on chosen category
  const handleAutoGenerateSku = () => {
    const cat = categories.find((c) => c.id === formData.categoryId);
    const code = cat ? cat.code : 'GEN';
    const existing = products
      .filter((p) => (editingProduct ? p.id !== editingProduct.id : true))
      .map((p) => p.sku);
    const generated = generateSKU(code, existing);
    setFormData((f) => ({ ...f, sku: generated }));
  };

  // Calculate live margin
  const liveMargin = useMemo(() => {
    const cost = Number(formData.costPrice) || 0;
    const sell = Number(formData.sellingPrice) || 0;
    if (sell <= 0) return 0;
    return ((sell - cost) / sell) * 100;
  }, [formData.costPrice, formData.sellingPrice]);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const existingSkus = products.filter((p) => (editingProduct ? p.id !== editingProduct.id : true));
    const validation = validateProduct({ ...formData, id: editingProduct?.id }, existingSkus);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
      setEditingProduct(null);
    } else {
      addProduct(formData);
      setIsAddModalOpen(false);
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'archived') return false;

      // Category filter
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (selectedStatus === 'IN_STOCK' && p.stock <= p.minStock) return false;
      if (selectedStatus === 'LOW_STOCK' && (p.stock <= 0 || p.stock > p.minStock)) return false;
      if (selectedStatus === 'OUT_OF_STOCK' && p.stock > 0) return false;

      return true;
    });
  }, [products, selectedCategory, selectedStatus]);

  // Export to CSV
  const handleExportCSV = () => {
    const exportData = filteredProducts.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1) : 0;
      return {
        SKU: p.sku,
        Name: p.name,
        Category: cat ? cat.name : 'Unknown',
        CostPrice: p.costPrice,
        SellingPrice: p.sellingPrice,
        MarginPercent: `${margin}%`,
        StockQuantity: p.stock,
        ReorderPoint: p.minStock,
        Unit: p.unit,
        Barcode: p.barcode,
        Status: p.status,
      };
    });
    exportToCSV(exportData, `novamart_products_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Table Columns
  const columns = [
    {
      header: 'Product Info',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem' }}>{row.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)', fontWeight: 600 }} className="sku">
              {row.sku}
            </span>
            {row.barcode && (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>• UPC: {row.barcode}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'categoryId',
      sortable: true,
      render: (row) => {
        const cat = categories.find((c) => c.id === row.categoryId);
        return (
          <span
            className="badge"
            style={{
              backgroundColor: cat ? `${cat.color}15` : 'var(--bg-subtle)',
              color: cat ? cat.color : 'var(--text-muted)',
              border: `1px solid ${cat ? `${cat.color}30` : 'var(--border-subtle)'}`,
            }}
          >
            {cat?.name || 'Uncategorized'}
          </span>
        );
      },
    },
    {
      header: 'Pricing',
      accessor: 'sellingPrice',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }} className="price">
            {formatCurrency(row.sellingPrice, settings.currency)}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Cost: <span className="price">{formatCurrency(row.costPrice, settings.currency)}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Margin',
      accessor: 'costPrice',
      sortable: true,
      render: (row) => {
        const margin = row.sellingPrice > 0 ? ((row.sellingPrice - row.costPrice) / row.sellingPrice) * 100 : 0;
        return (
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: margin > 40 ? 'var(--color-success)' : margin > 20 ? 'var(--color-blue)' : 'var(--color-warning)',
            }}
          >
            {formatPercent(margin)}
          </span>
        );
      },
    },
    {
      header: 'Stock Status',
      accessor: 'stock',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <StockBadge stock={row.stock} minStock={row.minStock} />
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Min: {row.minStock} {row.unit}
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setDetailProduct(row)}
            title="View Details"
            aria-label="View Details"
          >
            <Eye size={15} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleOpenEditModal(row)}
            title="Edit Product"
            aria-label="Edit Product"
          >
            <Edit2 size={15} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-danger)' }}
            onClick={() => setDeletingProductId(row.id)}
            title="Delete Product"
            aria-label="Delete Product"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Catalog"
        subtitle={`Managing ${filteredProducts.length} active items across ${categories.length} retail departments.`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </button>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Add Product
            </button>
          </>
        }
      />

      {/* Filter Tabs & Category Bar */}
      <div
        className="card"
        style={{
          padding: '0.875rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('ALL')}
          >
            All Products ({products.filter((p) => p.status !== 'archived').length})
          </button>
          <button
            className={`btn btn-sm ${selectedStatus === 'IN_STOCK' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('IN_STOCK')}
          >
            Healthy Stock
          </button>
          <button
            className={`btn btn-sm ${selectedStatus === 'LOW_STOCK' ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('LOW_STOCK')}
          >
            Low Stock Alerts
          </button>
          <button
            className={`btn btn-sm ${selectedStatus === 'OUT_OF_STOCK' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('OUT_OF_STOCK')}
          >
            Out of Stock
          </button>
        </div>

        {/* Category Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        searchPlaceholder="Search product by name, SKU, or UPC..."
        searchKeys={['name', 'sku', 'barcode', 'description']}
        pageSize={10}
        emptyMessage="No products match the selected criteria."
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingProduct}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? `Edit ${editingProduct.name}` : 'Create New Product'}
        size="lg"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitForm}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">
              Product Name * {formErrors.name && <span style={{ color: 'var(--color-danger)' }}>{formErrors.name}</span>}
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. AeroPulse Wireless ANC Headphones"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Category *{' '}
              {formErrors.categoryId && <span style={{ color: 'var(--color-danger)' }}>{formErrors.categoryId}</span>}
            </label>
            <select
              className="select"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              SKU (Stock Keeping Unit) *
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ padding: '0 4px', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                onClick={handleAutoGenerateSku}
              >
                <Sparkles size={12} /> Auto-Generate
              </button>
            </label>
            <input
              type="text"
              className="input sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
            />
            {formErrors.sku && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{formErrors.sku}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Cost Price ({settings.currency}) *
              {formErrors.costPrice && <span style={{ color: 'var(--color-danger)' }}>{formErrors.costPrice}</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="0.00"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Selling Price ({settings.currency}) *
              {formErrors.sellingPrice && <span style={{ color: 'var(--color-danger)' }}>{formErrors.sellingPrice}</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="0.00"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              required
            />
          </div>

          {/* Real-time Profit Margin Indicator */}
          <div
            style={{
              gridColumn: 'span 2',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Projected Gross Margin:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {liveMargin.toFixed(1)}%
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                (Profit: {formatCurrency(Math.max(0, (Number(formData.sellingPrice) || 0) - (Number(formData.costPrice) || 0)), settings.currency)})
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Current Stock Quantity *</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reorder Point (Min Threshold) *</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="10"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Unit of Measure</label>
            <select
              className="select"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
              <option value="bottle">Bottle</option>
              <option value="tin">Tin</option>
              <option value="jar">Jar</option>
              <option value="kg">Kilogram (kg)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Barcode / UPC</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 890123456701"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Product Description</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Detailed description, specifications, and features..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Product Detail Drawer */}
      <Drawer
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        title={detailProduct?.name || 'Product Details'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const prod = detailProduct;
                setDetailProduct(null);
                handleOpenEditModal(prod);
              }}
            >
              <Edit2 size={15} /> Edit Specs
            </button>
            <button className="btn btn-primary" onClick={() => setDetailProduct(null)}>
              Done
            </button>
          </div>
        }
      >
        {detailProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="sku" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                {detailProduct.sku}
              </span>
              <StockBadge stock={detailProduct.stock} minStock={detailProduct.minStock} />
            </div>

            <div className="card" style={{ padding: '1rem', background: 'var(--bg-canvas)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Description
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                {detailProduct.description || 'No description provided.'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="card" style={{ padding: '0.75rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Selling Price</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }} className="price">
                  {formatCurrency(detailProduct.sellingPrice, settings.currency)}
                </div>
              </div>

              <div className="card" style={{ padding: '0.75rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Cost Price</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }} className="price">
                  {formatCurrency(detailProduct.costPrice, settings.currency)}
                </div>
              </div>

              <div className="card" style={{ padding: '0.75rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Stock Available</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }} className="qty">
                  {detailProduct.stock} {detailProduct.unit}
                </div>
              </div>

              <div className="card" style={{ padding: '0.75rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Profit Margin</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-success)' }}>
                  {formatPercent(((detailProduct.sellingPrice - detailProduct.costPrice) / detailProduct.sellingPrice) * 100)}
                </div>
              </div>
            </div>

            {/* Product Movement History */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Recent Movement Logs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {movements
                  .filter((m) => m.productId === detailProduct.id)
                  .slice(0, 5)
                  .map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{m.type}</span> • {m.reason}
                        <div style={{ color: 'var(--text-light)', fontSize: '0.6875rem' }}>
                          {formatDate(m.timestamp, { relative: true })} by {m.user}
                        </div>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: m.quantity > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={() => {
          if (deletingProductId) {
            deleteProduct(deletingProductId);
            setDeletingProductId(null);
          }
        }}
        title="Delete / Archive Product"
        message="Are you sure you want to remove this product? If it has historical sales, it will be safely archived to preserve financial ledger accuracy."
        confirmText="Remove Product"
        danger={true}
      />
    </div>
  );
};
