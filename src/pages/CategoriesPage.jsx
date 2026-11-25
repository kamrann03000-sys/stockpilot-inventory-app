import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency, formatNumber } from '../utilities/formatters';
import { validateCategory } from '../utilities/validators';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Boxes,
  DollarSign,
  Package,
} from 'lucide-react';

const PRESET_COLORS = [
  '#7C3AED',
  '#2563EB',
  '#16A34A',
  '#0284C7',
  '#DB2777',
  '#D97706',
  '#9333EA',
  '#059669',
  '#E11D48',
  '#4F46E5',
];

export const CategoriesPage = () => {
  const { categories, products, sales, settings, addCategory, updateCategory, deleteCategory } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCatId, setDeletingCatId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#7C3AED',
  });
  const [formErrors, setFormErrors] = useState({});

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      color: PRESET_COLORS[categories.length % PRESET_COLORS.length],
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      color: cat.color || '#7C3AED',
    });
    setFormErrors({});
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const existing = categories.filter((c) => (editingCategory ? c.id !== editingCategory.id : true));
    const validation = validateCategory({ ...formData, id: editingCategory?.id }, existing);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, formData);
      setEditingCategory(null);
    } else {
      addCategory(formData);
      setIsAddModalOpen(false);
    }
  };

  // Compute category statistics dynamically
  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id && p.status !== 'archived');
      const productCount = catProducts.length;

      const totalStock = catProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
      const totalValuation = catProducts.reduce(
        (sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || 0),
        0
      );

      // Revenue from sales
      let totalRevenue = 0;
      sales.forEach((s) => {
        if (s.status === 'Completed') {
          s.items?.forEach((item) => {
            if (catProducts.some((p) => p.id === item.productId)) {
              totalRevenue += item.subtotal || item.price * item.quantity;
            }
          });
        }
      });

      return {
        ...cat,
        productCount,
        totalStock,
        totalValuation,
        totalRevenue,
      };
    });
  }, [categories, products, sales]);

  return (
    <div>
      <PageHeader
        title="Category Architecture"
        subtitle={`Organizing ${products.length} products into ${categories.length} core business divisions.`}
        actions={
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Category
          </button>
        }
      />

      <div className="categories-grid">
        {categoryStats.map((cat) => (
          <div key={cat.id} className="category-card">
            <div>
              <div className="category-card-top">
                <div
                  className="category-icon-box"
                  style={{
                    backgroundColor: `${cat.color}15`,
                    color: cat.color,
                    border: `1px solid ${cat.color}30`,
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{cat.code}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenEditModal(cat)}
                    title="Edit Category"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => setDeletingCatId(cat.id)}
                    title="Delete Category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {cat.name}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', minHeight: '38px', lineHeight: '1.4' }}>
                {cat.description || 'No description provided.'}
              </p>
            </div>

            <div>
              {/* Aggregated Stats Grid */}
              <div className="category-card-stats">
                <div className="category-stat-item">
                  <span className="stat-label">Products</span>
                  <span className="stat-value">{cat.productCount} items</span>
                </div>
                <div className="category-stat-item">
                  <span className="stat-label">Total Units</span>
                  <span className="stat-value">{formatNumber(cat.totalStock)} units</span>
                </div>
                <div className="category-stat-item">
                  <span className="stat-label">Inventory Value</span>
                  <span className="stat-value price">{formatCurrency(cat.totalValuation, settings.currency)}</span>
                </div>
                <div className="category-stat-item">
                  <span className="stat-label">Sales Revenue</span>
                  <span className="stat-value price" style={{ color: 'var(--color-primary)' }}>
                    {formatCurrency(cat.totalRevenue, settings.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingCategory}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
        size="md"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingCategory(null);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitForm}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">
              Category Name *{' '}
              {formErrors.name && <span style={{ color: 'var(--color-danger)' }}>{formErrors.name}</span>}
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Electronics & Gadgets"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Short Code (3-4 Letters for SKU) *{' '}
              {formErrors.code && <span style={{ color: 'var(--color-danger)' }}>{formErrors.code}</span>}
            </label>
            <input
              type="text"
              maxLength={4}
              className="input"
              style={{ textTransform: 'uppercase' }}
              placeholder="e.g. ELE"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: formData.color === c ? '3px solid #0F172A' : '2px solid white',
                    boxShadow: '0 0 0 1px var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Brief overview of items contained in this category..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCatId}
        onClose={() => setDeletingCatId(null)}
        onConfirm={() => {
          if (deletingCatId) {
            deleteCategory(deletingCatId);
            setDeletingCatId(null);
          }
        }}
        title="Delete Category"
        message="Are you sure you want to delete this category? If any active products belong to this category, deletion will be blocked to safeguard catalog integrity."
        confirmText="Delete Category"
        danger={true}
      />
    </div>
  );
};
