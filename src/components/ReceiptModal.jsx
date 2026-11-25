import React from 'react';
import { Modal } from './Modal';
import { Printer, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../utilities/formatters';
import { useApp } from '../context/AppContext';

export const ReceiptModal = ({ isOpen, onClose, sale, onNewSale }) => {
  const { settings } = useApp();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Receipt & Invoice"
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {onNewSale ? (
            <button
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                onNewSale();
              }}
            >
              Start New Sale
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          )}

          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      }
    >
      <div className="print-area">
        {/* Printable thermal receipt layout */}
        <div className="receipt-thermal" style={{ margin: '0 auto', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {settings.storeName}
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {settings.address}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tel: {settings.phone} | {settings.email}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8125rem',
              borderTop: '1px dashed var(--border-subtle)',
              borderBottom: '1px dashed var(--border-subtle)',
              padding: '0.625rem 0',
              margin: '0.75rem 0',
            }}
          >
            <div>
              <div><strong>Invoice:</strong> <span className="sku">{sale.invoiceNumber}</span></div>
              <div><strong>Date:</strong> <span className="date-num">{formatDate(sale.date, { includeTime: true })}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>Customer:</strong> {sale.customerName}</div>
              <div><strong>Cashier:</strong> {sale.cashier || 'NovaMart Staff'}</div>
            </div>
          </div>

          {/* Line Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', margin: '0.75rem 0' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ paddingBottom: '0.375rem' }}>Item</th>
                <th style={{ paddingBottom: '0.375rem', textAlign: 'center' }}>Qty</th>
                <th style={{ paddingBottom: '0.375rem', textAlign: 'right' }}>Price</th>
                <th style={{ paddingBottom: '0.375rem', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px dashed #F1F5F9' }}>
                  <td style={{ padding: '0.375rem 0' }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }} className="sku">{item.sku}</div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '0.375rem 0' }} className="qty">
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '0.375rem 0' }} className="price">
                    {formatCurrency(item.price, settings.currency)}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '0.375rem 0', fontWeight: 600 }} className="price">
                    {formatCurrency(item.subtotal || item.price * item.quantity, settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span className="price">{formatCurrency(sale.subtotal, settings.currency)}</span>
            </div>

            {sale.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                <span>Discount</span>
                <span className="price">-{formatCurrency(sale.discount, settings.currency)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sales Tax ({settings.taxRate}%)</span>
              <span className="price">{formatCurrency(sale.tax, settings.currency)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.0625rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                borderTop: '2px solid var(--text-main)',
                paddingTop: '0.375rem',
                marginTop: '0.25rem',
              }}
            >
              <span>Total Amount</span>
              <span className="price">{formatCurrency(sale.total, settings.currency)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <span>Payment Method:</span>
              <strong style={{ color: 'var(--text-main)' }}>{sale.paymentMethod}</strong>
            </div>

            {sale.paymentMethod === 'Cash' && sale.cashTendered > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span>Cash Tendered:</span>
                  <span className="price">{formatCurrency(sale.cashTendered, settings.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span>Change Given:</span>
                  <span className="price">{formatCurrency(sale.changeGiven, settings.currency)}</span>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              textAlign: 'center',
              borderTop: '1px dashed var(--border-subtle)',
              paddingTop: '1rem',
              marginTop: '1.25rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <p>{settings.receiptFooter}</p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-light)' }}>
              Powered by StockPilot • {settings.tagline}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
