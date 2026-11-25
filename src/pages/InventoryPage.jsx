import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { StockBadge, MovementBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatNumber, formatDate } from '../utilities/formatters';
import { exportToCSV } from '../utilities/csv';
import {
  Boxes,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  History,
  TrendingUp,
} from 'lucide-react';

export const InventoryPage = () => {
  const { products, categories, movements, kpis, settings, recordStockIn, recordStockOut, recordStockAdjustment } = useApp();

  const [activeTab, setActiveTab] = useState('LEVELS'); // LEVELS | MOVEMENTS

  // Modals state
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Form states
  const [stockInForm, setStockInForm] = useState({
    productId: '',
    quantity: 10,
    supplier: '',
    reference: '',
    notes: '',
  });

  const [stockOutForm, setStockOutForm] = useState({
    productId: '',
    quantity: 1,
    reason: 'Damaged in store',
    reference: '',
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    newStockCount: 0,
    reason: 'Routine physical inventory audit',
  });

  // Movement Filter
  const [movementFilterType, setMovementFilterType] = useState('ALL');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (movementFilterType === 'ALL') return true;
      return m.type === movementFilterType;
    });
  }, [movements, movementFilterType]);

  // Export Movements CSV
  const handleExportMovements = () => {
    const exportData = filteredMovements.map((m) => ({
      Timestamp: m.timestamp,
      Type: m.type,
      Product: m.productName,
      SKU: m.sku,
      QuantityChange: m.quantity,
      PreviousStock: m.previousStock,
      NewStock: m.newStock,
      Reference: m.reference,
      Reason: m.reason,
      User: m.user,
    }));
    exportToCSV(exportData, `novamart_stock_movements_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Handle Form Submissions
  const handleStockInSubmit = (e) => {
    e.preventDefault();
    if (!stockInForm.productId) return;
    recordStockIn({
      productId: stockInForm.productId,
      quantity: stockInForm.quantity,
      supplier: stockInForm.supplier,
      reference: stockInForm.reference,
      notes: stockInForm.notes,
      user: 'Inventory Manager',
    });
    setIsStockInModalOpen(false);
  };

  const handleStockOutSubmit = (e) => {
    e.preventDefault();
    if (!stockOutForm.productId) return;
    const ok = recordStockOut({
      productId: stockOutForm.productId,
      quantity: stockOutForm.quantity,
      reason: stockOutForm.reason,
      reference: stockOutForm.reference,
      notes: stockOutForm.notes,
      user: 'Inventory Manager',
    });
    if (ok) setIsStockOutModalOpen(false);
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!adjustForm.productId) return;
    recordStockAdjustment({
      productId: adjustForm.productId,
      newStockCount: adjustForm.newStockCount,
      reason: adjustForm.reason,
      user: 'Inventory Auditor',
    });
    setIsAdjustModalOpen(false);
  };

  // Stock Level Columns
  const levelColumns = [
    {
      header: 'Product',
      accessor: 'name',
      sortable: true,
      render: (p) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)', marginTop: '0.125rem' }} className="sku">
            {p.sku}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'categoryId',
      sortable: true,
      render: (p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        return <span className="badge badge-neutral">{cat?.name || 'General'}</span>;
      },
    },
    {
      header: 'On Hand',
      accessor: 'stock',
      sortable: true,
      render: (p) => (
        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }} className="qty">
          {p.stock} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>{p.unit}</span>
        </div>
      ),
    },
    {
      header: 'Threshold',
      accessor: 'minStock',
      sortable: true,
      render: (p) => (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Min: <strong style={{ color: 'var(--text-main)' }}>{p.minStock}</strong> / Max: {p.maxStock || '—'}
        </div>
      ),
    },
    {
      header: 'Health Status',
      accessor: 'stock',
      sortable: true,
      render: (p) => <StockBadge stock={p.stock} minStock={p.minStock} />,
    },
    {
      header: 'Quick Adjust',
      align: 'right',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setStockInForm({ productId: p.id, quantity: 10, supplier: 'NovaMart Distribution', reference: '', notes: '' });
              setIsStockInModalOpen(true);
            }}
            title="Receive Stock"
          >
            + In
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setStockOutForm({ productId: p.id, quantity: 1, reason: 'Damaged item', reference: '', notes: '' });
              setIsStockOutModalOpen(true);
            }}
            title="Deduct Stock"
          >
            - Out
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setAdjustForm({ productId: p.id, newStockCount: p.stock, reason: 'Physical audit count' });
              setIsAdjustModalOpen(true);
            }}
            title="Audit Reconcile"
          >
            Audit
          </button>
        </div>
      ),
    },
  ];

  // Movements Columns
  const movementColumns = [
    {
      header: 'Date & Time',
      accessor: 'timestamp',
      sortable: true,
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }} className="date-num">
            {formatDate(m.timestamp, { includeTime: true })}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatDate(m.timestamp, { relative: true })}</div>
        </div>
      ),
    },
    {
      header: 'Action Type',
      accessor: 'type',
      sortable: true,
      render: (m) => <MovementBadge type={m.type} />,
    },
    {
      header: 'Product Involved',
      accessor: 'productName',
      sortable: true,
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{m.productName}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }} className="sku">
            {m.sku}
          </div>
        </div>
      ),
    },
    {
      header: 'Qty Change',
      accessor: 'quantity',
      sortable: true,
      render: (m) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: '0.9375rem',
            color: m.quantity > 0 ? 'var(--color-success)' : 'var(--color-danger)',
          }}
          className="num"
        >
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
        </span>
      ),
    },
    {
      header: 'Audit Impact',
      render: (m) => (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {m.previousStock} → <strong style={{ color: 'var(--text-main)' }}>{m.newStock}</strong>
        </div>
      ),
    },
    {
      header: 'Reference & Reason',
      accessor: 'reason',
      render: (m) => (
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{m.reason}</div>
          {m.reference && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
              Ref: <span className="sku">{m.reference}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Operator',
      accessor: 'user',
      render: (m) => <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.user}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Operations & Movement Ledger"
        subtitle="Manage inventory restocks, damaged write-offs, physical count audits, and movement logs."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (products.length > 0) setStockInForm((f) => ({ ...f, productId: products[0].id }));
                setIsStockInModalOpen(true);
              }}
            >
              <PackagePlus size={16} /> Stock In
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (products.length > 0) setStockOutForm((f) => ({ ...f, productId: products[0].id }));
                setIsStockOutModalOpen(true);
              }}
            >
              <PackageMinus size={16} /> Stock Out
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (products.length > 0) setAdjustForm((f) => ({ ...f, productId: products[0].id, newStockCount: products[0].stock }));
                setIsAdjustModalOpen(true);
              }}
            >
              <SlidersHorizontal size={16} /> Audit Count
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Stock Units"
          value={formatNumber(kpis.totalUnits)}
          icon={Boxes}
          variant="violet"
          subtitle={`${products.filter((p) => p.status !== 'archived').length} Active SKUs`}
        />

        <KpiCard
          label="Cost Valuation"
          value={formatCurrency(kpis.totalValuationCost, settings.currency)}
          icon={TrendingUp}
          variant="blue"
          subtitle={`Retail Value: ${formatCurrency(kpis.totalValuationRetail, settings.currency)}`}
        />

        <KpiCard
          label="Low Stock Alerts"
          value={`${kpis.lowStockCount} Items`}
          icon={AlertTriangle}
          variant={kpis.lowStockCount > 0 ? 'orange' : 'green'}
          delta={kpis.lowStockCount > 0 ? 'Action Needed' : 'Nominal'}
          deltaType={kpis.lowStockCount > 0 ? 'warning' : 'positive'}
          subtitle="At or below reorder point"
        />

        <KpiCard
          label="Out of Stock"
          value={`${kpis.outOfStockCount} Items`}
          icon={AlertTriangle}
          variant={kpis.outOfStockCount > 0 ? 'red' : 'green'}
          delta={kpis.outOfStockCount > 0 ? 'Critical' : 'Healthy'}
          deltaType={kpis.outOfStockCount > 0 ? 'negative' : 'positive'}
          subtitle="Zero available units"
        />
      </div>

      {/* View Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'LEVELS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LEVELS')}
        >
          Stock Level Monitor
        </button>
        <button
          className={`tab-btn ${activeTab === 'MOVEMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('MOVEMENTS')}
        >
          Audit Movements Trail ({movements.length})
        </button>
      </div>

      {/* Tab 1: Current Stock Levels */}
      {activeTab === 'LEVELS' && (
        <DataTable
          columns={levelColumns}
          data={products.filter((p) => p.status !== 'archived')}
          searchPlaceholder="Search product stock by name or SKU..."
          searchKeys={['name', 'sku']}
          pageSize={10}
        />
      )}

      {/* Tab 2: Movements Audit Log */}
      {activeTab === 'MOVEMENTS' && (
        <div>
          {/* Movement type filter tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {['ALL', 'IN', 'OUT', 'ADJUSTMENT', 'SALE', 'RETURN'].map((type) => (
                <button
                  key={type}
                  className={`btn btn-sm ${movementFilterType === type ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMovementFilterType(type)}
                >
                  {type === 'ALL' ? 'All Movements' : type}
                </button>
              ))}
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleExportMovements}>
              <Download size={14} /> Export Movement Log
            </button>
          </div>

          <DataTable
            columns={movementColumns}
            data={filteredMovements}
            searchPlaceholder="Search movements by product, reason, reference..."
            searchKeys={['productName', 'sku', 'reason', 'reference', 'user']}
            pageSize={10}
            emptyMessage="No stock movements logged for this filter."
          />
        </div>
      )}

      {/* Stock In Modal */}
      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title="Record Stock In (Supplier Delivery)"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsStockInModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleStockInSubmit}>
              Confirm Stock In
            </button>
          </>
        }
      >
        <form onSubmit={handleStockInSubmit}>
          <div className="form-group">
            <label className="form-label">Product *</label>
            <select
              className="select"
              value={stockInForm.productId}
              onChange={(e) => setStockInForm({ ...stockInForm, productId: e.target.value })}
              required
            >
              <option value="">-- Choose Product --</option>
              {products
                .filter((p) => p.status !== 'archived')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Current: {p.stock}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity Received *</label>
            <input
              type="number"
              className="input"
              min="1"
              value={stockInForm.quantity}
              onChange={(e) => setStockInForm({ ...stockInForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Supplier / Vendor Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Acme Wholesale Direct"
              value={stockInForm.supplier}
              onChange={(e) => setStockInForm({ ...stockInForm, supplier: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">PO / Delivery Reference</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. PO-2026-904"
              value={stockInForm.reference}
              onChange={(e) => setStockInForm({ ...stockInForm, reference: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Storage Bin</label>
            <input
              type="text"
              className="input"
              placeholder="Received in good condition at Backroom Bay 4"
              value={stockInForm.notes}
              onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Stock Out Modal */}
      <Modal
        isOpen={isStockOutModalOpen}
        onClose={() => setIsStockOutModalOpen(false)}
        title="Record Stock Out (Deduction / Write-off)"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsStockOutModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleStockOutSubmit}>
              Confirm Stock Out
            </button>
          </>
        }
      >
        <form onSubmit={handleStockOutSubmit}>
          <div className="form-group">
            <label className="form-label">Product *</label>
            <select
              className="select"
              value={stockOutForm.productId}
              onChange={(e) => setStockOutForm({ ...stockOutForm, productId: e.target.value })}
              required
            >
              <option value="">-- Choose Product --</option>
              {products
                .filter((p) => p.status !== 'archived')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Available: {p.stock}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity to Deduct *</label>
            <input
              type="number"
              className="input"
              min="1"
              value={stockOutForm.quantity}
              onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Removal *</label>
            <select
              className="select"
              value={stockOutForm.reason}
              onChange={(e) => setStockOutForm({ ...stockOutForm, reason: e.target.value })}
            >
              <option value="Damaged in store">Damaged in store</option>
              <option value="Expired / Past shelf life">Expired / Past shelf life</option>
              <option value="Internal store use / Display sample">Internal store use / Display sample</option>
              <option value="Lost / Unaccounted shortage">Lost / Unaccounted shortage</option>
              <option value="Vendor return / Defective batch">Vendor return / Defective batch</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Audit Reference</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. DAMAGE-REPORT-104"
              value={stockOutForm.reference}
              onChange={(e) => setStockOutForm({ ...stockOutForm, reference: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Notes</label>
            <input
              type="text"
              className="input"
              placeholder="Specific reason or incident notes..."
              value={stockOutForm.notes}
              onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Adjust / Audit Count Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Physical Inventory Audit Reconciliation"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAdjustSubmit}>
              Reconcile Inventory
            </button>
          </>
        }
      >
        <form onSubmit={handleAdjustSubmit}>
          <div className="form-group">
            <label className="form-label">Product to Reconcile *</label>
            <select
              className="select"
              value={adjustForm.productId}
              onChange={(e) => {
                const target = products.find((p) => p.id === e.target.value);
                setAdjustForm({
                  ...adjustForm,
                  productId: e.target.value,
                  newStockCount: target ? target.stock : 0,
                });
              }}
              required
            >
              <option value="">-- Choose Product --</option>
              {products
                .filter((p) => p.status !== 'archived')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — System Count: {p.stock}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Actual Physical Count Counted *</label>
            <input
              type="number"
              className="input"
              min="0"
              value={adjustForm.newStockCount}
              onChange={(e) => setAdjustForm({ ...adjustForm, newStockCount: Math.max(0, parseInt(e.target.value) || 0) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Audit Reason / Justification</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. End of month physical inventory verification"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
