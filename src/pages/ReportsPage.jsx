import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { StockBadge } from '../components/Badge';
import { formatCurrency, formatPercent, formatNumber } from '../utilities/formatters';
import { exportToCSV } from '../utilities/csv';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  PieChart as PieIcon,
  BarChart3,
  Download,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const ReportsPage = () => {
  const { sales, products, categories, settings } = useApp();

  const [timeRange, setTimeRange] = useState('30D'); // 7D | 30D | ALL

  // Filter sales based on time range
  const filteredSales = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'Completed');
    if (timeRange === 'ALL') return completed;

    const days = timeRange === '7D' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return completed.filter((s) => {
      if (!s.date) return false;
      return new Date(s.date) >= cutoff;
    });
  }, [sales, timeRange]);

  // Aggregate Financial Metrics
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let totalCOGS = 0;
    let itemsSold = 0;

    filteredSales.forEach((sale) => {
      grossRevenue += Number(sale.total) || 0;
      sale.items?.forEach((item) => {
        itemsSold += item.quantity;
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.costPrice : 0;
        totalCOGS += cost * item.quantity;
      });
    });

    const grossProfit = Math.max(0, grossRevenue - totalCOGS);
    const margin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      totalCOGS,
      grossProfit,
      margin,
      itemsSold,
      ordersCount: filteredSales.length,
    };
  }, [filteredSales, products]);

  // Daily Trend Data for Revenue & Profit
  const trendData = useMemo(() => {
    const dateMap = {};
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 14 : 30;
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[key] = { date: label, revenue: 0, profit: 0 };
    }

    filteredSales.forEach((sale) => {
      if (!sale.date) return;
      const key = sale.date.split('T')[0];
      if (dateMap[key]) {
        dateMap[key].revenue += Number(sale.total) || 0;

        let saleCost = 0;
        sale.items?.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          saleCost += (prod ? prod.costPrice : 0) * item.quantity;
        });

        dateMap[key].profit += Math.max(0, (Number(sale.total) || 0) - saleCost);
      }
    });

    return Object.values(dateMap).map((d) => ({
      ...d,
      revenue: Number(d.revenue.toFixed(2)),
      profit: Number(d.profit.toFixed(2)),
    }));
  }, [filteredSales, products, timeRange]);

  // Category Revenue Breakdown (Pie Chart)
  const categoryBreakdown = useMemo(() => {
    const catMap = {};
    categories.forEach((c) => {
      catMap[c.id] = { name: c.name, color: c.color, value: 0 };
    });

    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && catMap[prod.categoryId]) {
          catMap[prod.categoryId].value += item.subtotal || item.price * item.quantity;
        }
      });
    });

    return Object.values(catMap)
      .filter((c) => c.value > 0)
      .map((c) => ({ ...c, value: Number(c.value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales, products, categories]);

  // Top 5 Products by Revenue
  const topProductsChart = useMemo(() => {
    const prodMap = {};
    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        if (!prodMap[item.productId]) {
          prodMap[item.productId] = { name: item.name, revenue: 0, units: 0 };
        }
        prodMap[item.productId].revenue += item.subtotal || item.price * item.quantity;
        prodMap[item.productId].units += item.quantity;
      });
    });

    return Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        name: p.name.length > 20 ? `${p.name.substring(0, 18)}...` : p.name,
        fullName: p.name,
        revenue: Number(p.revenue.toFixed(2)),
        units: p.units,
      }));
  }, [filteredSales]);

  // Payment Method Distribution
  const paymentBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      const m = s.paymentMethod || 'Other';
      map[m] = (map[m] || 0) + (Number(s.total) || 0);
    });

    return Object.entries(map).map(([method, total]) => ({
      method,
      total: Number(total.toFixed(2)),
    }));
  }, [filteredSales]);

  // Fast vs Slow Moving Stock
  const productVelocity = useMemo(() => {
    const soldMap = {};
    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        soldMap[item.productId] = (soldMap[item.productId] || 0) + item.quantity;
      });
    });

    const activeProds = products.filter((p) => p.status !== 'archived');
    const sorted = [...activeProds].map((p) => ({
      ...p,
      unitsSold: soldMap[p.id] || 0,
    }));

    sorted.sort((a, b) => b.unitsSold - a.unitsSold);

    return {
      fast: sorted.slice(0, 5),
      slow: sorted.filter((p) => p.unitsSold === 0 || p.unitsSold <= 1).slice(0, 5),
    };
  }, [filteredSales, products]);

  // Export Executive Report
  const handleExportReportCSV = () => {
    const reportData = [
      { Metric: 'Reporting Timeframe', Value: timeRange },
      { Metric: 'Gross Revenue', Value: formatCurrency(metrics.grossRevenue, settings.currency) },
      { Metric: 'Cost of Goods Sold (COGS)', Value: formatCurrency(metrics.totalCOGS, settings.currency) },
      { Metric: 'Gross Margin', Value: formatCurrency(metrics.grossProfit, settings.currency) },
      { Metric: 'Profit Margin %', Value: `${metrics.margin.toFixed(2)}%` },
      { Metric: 'Completed Orders', Value: metrics.ordersCount },
      { Metric: 'Total Units Sold', Value: metrics.itemsSold },
    ];
    exportToCSV(reportData, `novamart_executive_report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div>
      <PageHeader
        title="Business Intelligence & Analytics"
        subtitle="Financial performance, sales trends, margin analysis, and inventory velocity."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
              {['7D', '30D', 'ALL'].map((r) => (
                <button
                  key={r}
                  className={`btn btn-sm ${timeRange === r ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                  onClick={() => setTimeRange(r)}
                >
                  {r === '7D' ? '7 Days' : r === '30D' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={handleExportReportCSV}>
              <Download size={16} /> Export Report
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Gross Revenue"
          value={formatCurrency(metrics.grossRevenue, settings.currency)}
          icon={DollarSign}
          variant="blue"
          delta={`${metrics.ordersCount} Sales`}
          deltaType="positive"
          subtitle={`COGS: ${formatCurrency(metrics.totalCOGS, settings.currency)}`}
        />

        <KpiCard
          label="Gross Profit"
          value={formatCurrency(metrics.grossProfit, settings.currency)}
          icon={TrendingUp}
          variant="violet"
          delta={`${metrics.margin.toFixed(1)}%`}
          deltaType="positive"
          subtitle="Net sales margin"
        />

        <KpiCard
          label="Units Sold"
          value={formatNumber(metrics.itemsSold)}
          icon={Receipt}
          variant="green"
          subtitle="Total volume dispatched"
        />

        <KpiCard
          label="Avg Basket Size"
          value={formatCurrency(metrics.ordersCount > 0 ? metrics.grossRevenue / metrics.ordersCount : 0, settings.currency)}
          icon={BarChart3}
          variant="violet"
          subtitle="Average order value"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="dashboard-grid">
        {/* Revenue & Profit Dual Trend Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={18} color="var(--color-primary)" /> Revenue & Profit Progression
              </h3>
              <p className="card-subtitle">Daily comparison between top-line revenue and net gross margin</p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${settings.currency}${val}`}
                />
                <Tooltip
                  formatter={(val, name) => [
                    formatCurrency(val, settings.currency),
                    name === 'revenue' ? 'Gross Revenue' : 'Gross Profit',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#16A34A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProf)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Donut Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <PieIcon size={18} color="var(--color-primary)" /> Sales by Category
              </h3>
              <p className="card-subtitle">Share of sales volume across departments</p>
            </div>
          </div>

          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#7C3AED'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatCurrency(val, settings.currency), 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No category sales recorded in this timeframe.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products & Payment Methods Breakdown */}
      <div className="dashboard-grid">
        {/* Top 5 Products Horizontal Bar Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <BarChart3 size={18} color="var(--color-primary)" /> Top 5 Revenue Drivers
              </h3>
              <p className="card-subtitle">Products generating the largest total sales volume</p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProductsChart} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${settings.currency}${val}`}
                />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  formatter={(val, name, props) => [
                    formatCurrency(val, settings.currency),
                    `${props.payload.fullName} (${props.payload.units} units)`,
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Bar Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <DollarSign size={18} color="var(--color-blue)" /> Payment Channels
              </h3>
              <p className="card-subtitle">Revenue grouped by customer tender method</p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={paymentBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="method" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${settings.currency}${val}`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(val, settings.currency), 'Tendered']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inventory Velocity: Fast Movers vs Slow Movers */}
      <div className="dashboard-grid" style={{ marginBottom: 0 }}>
        {/* Fast Moving Items */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ color: 'var(--color-success)' }}>
                <TrendingUp size={18} /> High Velocity Items (Fast Movers)
              </h3>
              <p className="card-subtitle">Highest frequency of customer sales</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {productVelocity.fast.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }} className="sku">
                    {p.sku} • Stock: {p.stock} {p.unit}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success">{p.unitsSold} units sold</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slow Moving / Dead Stock */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ color: 'var(--color-warning)' }}>
                <AlertCircle size={18} /> Slow Moving / Low Turnover Items
              </h3>
              <p className="card-subtitle">Items with little or zero customer demand</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {productVelocity.slow.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }} className="sku">
                    {p.sku} • Capital tied: {formatCurrency(p.stock * p.costPrice, settings.currency)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-warning">{p.unitsSold} sold in period</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
