import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../layout/PageHeader';
import { formatCurrency, formatDate } from '../utilities/formatters';
import { ReceiptModal } from '../components/ReceiptModal';
import { Modal } from '../components/Modal';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Plus,
  ArrowRight,
  PackagePlus,
  Receipt,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { kpis, sales, products, categories, settings, recordStockIn } = useApp();

  // Receipt modal state
  const [selectedSale, setSelectedSale] = useState(null);

  // Quick Restock modal state from dashboard banner
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockForm, setRestockForm] = useState({
    productId: '',
    quantity: 10,
    supplier: 'NovaMart Direct Distribution',
    notes: 'Urgent low-stock restock from dashboard',
  });

  // Calculate 7-day revenue trend data for chart
  const revenueTrendData = useMemo(() => {
    const daysMap = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap[key] = { date: label, revenue: 0, orders: 0 };
    }

    sales.forEach((s) => {
      if (s.status === 'Completed' && s.date) {
        const key = s.date.split('T')[0];
        if (daysMap[key]) {
          daysMap[key].revenue += Number(s.total) || 0;
          daysMap[key].orders += 1;
        }
      }
    });

    return Object.values(daysMap);
  }, [sales]);

  // Calculate inventory valuation by category for bar chart
  const categoryChartData = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id && p.status !== 'archived');
      const totalValuation = catProducts.reduce(
        (sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || 0),
        0
      );
      return {
        name: cat.code || cat.name.substring(0, 8),
        fullName: cat.name,
        value: Number(totalValuation.toFixed(2)),
      };
    });
  }, [categories, products]);

  // Top 5 selling products
  const topProducts = useMemo(() => {
    const map = {};
    sales.forEach((sale) => {
      if (sale.status === 'Completed') {
        sale.items?.forEach((item) => {
          if (!map[item.productId]) {
            map[item.productId] = {
              id: item.productId,
              name: item.name,
              sku: item.sku,
              quantity: 0,
              revenue: 0,
            };
          }
          map[item.productId].quantity += item.quantity;
          map[item.productId].revenue += item.subtotal || item.price * item.quantity;
        });
      }
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // Low stock products
  const lowStockList = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock && p.status !== 'archived');
  }, [products]);

  const handleQuickRestockSubmit = (e) => {
    e.preventDefault();
    if (!restockForm.productId) return;
    recordStockIn({
      productId: restockForm.productId,
      quantity: restockForm.quantity,
      supplier: restockForm.supplier,
      notes: restockForm.notes,
      user: 'Dashboard Quick Action',
    });
    setRestockModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Store Operations & Intelligence"
        subtitle={`Welcome back! Monitoring live retail stock for ${settings.storeName}.`}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (lowStockList.length > 0) {
                  setRestockForm((f) => ({ ...f, productId: lowStockList[0].id }));
                } else if (products.length > 0) {
                  setRestockForm((f) => ({ ...f, productId: products[0].id }));
                }
                setRestockModalOpen(true);
              }}
            >
              <PackagePlus size={16} /> Quick Restock
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/sales')}>
              <ShoppingCart size={16} /> Open POS Register
            </button>
          </>
        }
      />

      {/* Low Stock Warning Banner */}
      {lowStockList.length > 0 && (
        <div className="alert-banner">
          <div className="alert-banner-left">
            <div className="alert-banner-icon">
              <AlertTriangle size={20} />
            </div>
            <div className="alert-banner-text">
              <h4>
                {lowStockList.length} Product{lowStockList.length > 1 ? 's' : ''} Require Immediate Restock
              </h4>
              <p>
                Stock levels have dropped below defined thresholds. Replenish inventory now to prevent lost sales.
              </p>
            </div>
          </div>
          <button
            className="btn btn-warning btn-sm"
            onClick={() => {
              setRestockForm((f) => ({ ...f, productId: lowStockList[0]?.id || '' }));
              setRestockModalOpen(true);
            }}
          >
            Reorder Now <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Top KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue, settings.currency)}
          icon={DollarSign}
          variant="blue"
          delta={`${kpis.totalOrders} Orders`}
          deltaType="positive"
          subtitle="All completed sales"
        />

        <KpiCard
          label="Gross Profit"
          value={formatCurrency(kpis.grossProfit, settings.currency)}
          icon={TrendingUp}
          variant="violet"
          delta={`${kpis.profitMargin.toFixed(1)}%`}
          deltaType="positive"
          subtitle="Net operational margin"
        />

        <KpiCard
          label="Inventory Valuation"
          value={formatCurrency(kpis.totalValuationCost, settings.currency)}
          icon={Boxes}
          variant="green"
          delta={`${kpis.totalUnits} Units`}
          deltaType="positive"
          subtitle={`Retail: ${formatCurrency(kpis.totalValuationRetail, settings.currency)}`}
        />

        <KpiCard
          label="Inventory Health"
          value={`${kpis.lowStockCount} Low`}
          icon={AlertTriangle}
          variant={kpis.outOfStockCount > 0 ? 'red' : kpis.lowStockCount > 0 ? 'orange' : 'green'}
          delta={`${kpis.outOfStockCount} Out`}
          deltaType={kpis.outOfStockCount > 0 ? 'negative' : 'warning'}
          subtitle={`${kpis.activeProductsCount} catalog items`}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="dashboard-grid">
        {/* Revenue Trend Area Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <DollarSign size={18} color="var(--color-primary)" /> Sales Revenue Trend
              </h3>
              <p className="card-subtitle">Daily transaction volume over the last 7 days</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>
              View Analytics <ArrowRight size={14} />
            </button>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `${settings.currency}${val}`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(val, settings.currency), 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Valuation by Category Bar Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Layers size={18} color="var(--color-blue)" /> Category Valuation
              </h3>
              <p className="card-subtitle">Capital allocated per category (Cost)</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/categories')}>
              Categories <ArrowRight size={14} />
            </button>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${settings.currency}${val}`}
                />
                <Tooltip
                  formatter={(val, name, props) => [
                    formatCurrency(val, settings.currency),
                    props.payload.fullName || 'Valuation',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Sales & Top Products Leaderboard */}
      <div className="dashboard-grid">
        {/* Recent Transactions Feed */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Receipt size={18} color="var(--color-primary)" /> Recent Transactions
              </h3>
              <p className="card-subtitle">Latest cashier checkout receipts</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')}>
              All Sales <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {sales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-canvas)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }} className="sku">
                      {sale.invoiceNumber}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {sale.customerName} • {formatDate(sale.date, { relative: true })}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)' }} className="price">
                    {formatCurrency(sale.total, settings.currency)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    View Receipt
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={18} color="var(--color-success)" /> Top Performing Products
              </h3>
              <p className="card-subtitle">Highest revenue contributors</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>
              Catalog <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topProducts.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  paddingBottom: '0.625rem',
                  borderBottom: idx < topProducts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--color-primary-tint)' : 'var(--bg-subtle)',
                      color: idx === 0 ? 'var(--color-primary)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }} className="sku">
                      {p.sku} • {p.quantity} units sold
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }} className="price">
                    {formatCurrency(p.revenue, settings.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Restock Modal */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title="Quick Inventory Restock"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setRestockModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleQuickRestockSubmit}>
              Confirm Stock Receipt
            </button>
          </>
        }
      >
        <form onSubmit={handleQuickRestockSubmit}>
          <div className="form-group">
            <label className="form-label">Select Target Product</label>
            <select
              className="select"
              value={restockForm.productId}
              onChange={(e) => setRestockForm({ ...restockForm, productId: e.target.value })}
              required
            >
              <option value="">-- Choose product --</option>
              {products
                .filter((p) => p.status !== 'archived')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Current Stock: {p.stock}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity to Add</label>
            <input
              type="number"
              className="input"
              min="1"
              value={restockForm.quantity}
              onChange={(e) => setRestockForm({ ...restockForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Supplier / Distributor</label>
            <input
              type="text"
              className="input"
              value={restockForm.supplier}
              onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Reference</label>
            <input
              type="text"
              className="input"
              value={restockForm.notes}
              onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  );
};
