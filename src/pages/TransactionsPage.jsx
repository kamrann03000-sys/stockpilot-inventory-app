import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { TransactionBadge } from '../components/Badge';
import { DataTable } from '../components/DataTable';
import { ReceiptModal } from '../components/ReceiptModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../utilities/formatters';
import { exportToCSV } from '../utilities/csv';
import {
  Receipt,
  DollarSign,
  ShoppingCart,
  RotateCcw,
  Download,
  Eye,
  Printer,
  Calendar,
} from 'lucide-react';

export const TransactionsPage = () => {
  const { sales, settings, refundSale } = useApp();

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState('ALL');
  const [viewingSale, setViewingSale] = useState(null);
  const [refundingSaleId, setRefundingSaleId] = useState(null);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
      if (selectedPayment !== 'ALL' && s.paymentMethod !== selectedPayment) return false;
      return true;
    });
  }, [sales, selectedStatus, selectedPayment]);

  // Transaction KPIs
  const stats = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'Completed');
    const totalRev = completed.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const aov = completed.length > 0 ? totalRev / completed.length : 0;
    const refunded = sales.filter((s) => s.status === 'Refunded').length;

    return {
      totalRev,
      ordersCount: completed.length,
      aov,
      refunded,
    };
  }, [sales]);

  // Export to CSV
  const handleExportCSV = () => {
    const exportData = filteredSales.map((s) => ({
      InvoiceNumber: s.invoiceNumber,
      Date: s.date,
      CustomerName: s.customerName,
      ItemsCount: s.items?.reduce((cnt, i) => cnt + i.quantity, 0) || 0,
      Subtotal: s.subtotal,
      Discount: s.discount,
      Tax: s.tax,
      Total: s.total,
      PaymentMethod: s.paymentMethod,
      Cashier: s.cashier,
      Status: s.status,
    }));
    exportToCSV(exportData, `novamart_sales_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Table Columns
  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      sortable: true,
      render: (s) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }} className="sku">
          {s.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Date & Time',
      accessor: 'date',
      sortable: true,
      render: (s) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }} className="date-num">
            {formatDate(s.date, { includeTime: true })}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {formatDate(s.date, { relative: true })}
          </div>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customerName',
      sortable: true,
      render: (s) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{s.customerName}</div>
          {s.customerPhone && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{s.customerPhone}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Items Purchased',
      accessor: 'items',
      render: (s) => {
        const totalItems = s.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        const preview = s.items?.map((i) => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ');
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              {totalItems} item{totalItems > 1 ? 's' : ''}
            </div>
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
                maxWidth: '220px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={preview}
            >
              {preview}
              {s.items?.length > 2 && '...'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Payment',
      accessor: 'paymentMethod',
      sortable: true,
      render: (s) => <span className="badge badge-neutral">{s.paymentMethod}</span>,
    },
    {
      header: 'Total Paid',
      accessor: 'total',
      sortable: true,
      render: (s) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: '0.9375rem',
            color: s.status === 'Refunded' ? 'var(--text-muted)' : 'var(--text-main)',
            textDecoration: s.status === 'Refunded' ? 'line-through' : 'none',
          }}
          className="price"
        >
          {formatCurrency(s.total, settings.currency)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (s) => <TransactionBadge status={s.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setViewingSale(s)}
            title="View Receipt"
            aria-label="View Receipt"
          >
            <Printer size={15} />
          </button>
          {s.status === 'Completed' && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-danger)' }}
              onClick={() => setRefundingSaleId(s.id)}
              title="Refund Order"
              aria-label="Refund Order"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Ledger & Transactions"
        subtitle={`Audit complete register transactions, customer orders, and returns for ${settings.storeName}.`}
        actions={
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export Sales CSV
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRev, settings.currency)}
          icon={DollarSign}
          variant="blue"
          subtitle="All completed counter sales"
        />

        <KpiCard
          label="Orders Count"
          value={stats.ordersCount}
          icon={ShoppingCart}
          variant="violet"
          subtitle="Completed transactions"
        />

        <KpiCard
          label="Average Order Value"
          value={formatCurrency(stats.aov, settings.currency)}
          icon={Receipt}
          variant="green"
          subtitle="Mean basket size per sale"
        />

        <KpiCard
          label="Returns / Refunds"
          value={stats.refunded}
          icon={RotateCcw}
          variant={stats.refunded > 0 ? 'orange' : 'green'}
          subtitle="Items restocked to inventory"
        />
      </div>

      {/* Filters Bar */}
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
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('ALL')}
          >
            All Orders ({sales.length})
          </button>
          <button
            className={`btn btn-sm ${selectedStatus === 'Completed' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('Completed')}
          >
            Completed
          </button>
          <button
            className={`btn btn-sm ${selectedStatus === 'Refunded' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus('Refunded')}
          >
            Refunded
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payment:</span>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
          >
            <option value="ALL">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Apple Pay">Apple Pay</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredSales}
        searchPlaceholder="Search invoice #, customer name, or payment method..."
        searchKeys={['invoiceNumber', 'customerName', 'paymentMethod', 'cashier']}
        pageSize={10}
        emptyMessage="No sales transactions match the criteria."
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        sale={viewingSale}
      />

      {/* Refund Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!refundingSaleId}
        onClose={() => setRefundingSaleId(null)}
        onConfirm={() => {
          if (refundingSaleId) {
            refundSale(refundingSaleId, 'Customer Return / Exchange');
            setRefundingSaleId(null);
          }
        }}
        title="Refund Order"
        message="Are you sure you want to refund this order? The order will be marked as Refunded and all items will be automatically restocked back into inventory."
        confirmText="Confirm Refund & Restock"
        danger={true}
      />
    </div>
  );
};
