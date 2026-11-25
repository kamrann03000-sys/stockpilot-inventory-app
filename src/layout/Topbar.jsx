import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Menu, Clock, ShoppingCart, Bell, AlertTriangle } from 'lucide-react';

const ROUTE_NAMES = {
  '/dashboard': 'Executive Dashboard',
  '/products': 'Product Catalog Management',
  '/categories': 'Category Architecture',
  '/inventory': 'Stock Control & Adjustments',
  '/sales': 'Point of Sale (POS) Register',
  '/transactions': 'Sales Ledger & Orders',
  '/reports': 'Financial Intelligence & Reports',
  '/settings': 'System Settings & Data',
};

export const Topbar = ({ onToggleMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { kpis, products } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeTitle = ROUTE_NAMES[location.pathname] || 'Overview';

  // Get low-stock items for notification dropdown
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock && p.status !== 'archived');

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onToggleMobile} aria-label="Open menu">
          <Menu size={20} />
        </button>

        <div className="topbar-breadcrumbs">
          <span>StockPilot</span>
          <span>/</span>
          <h2 className="topbar-title">{activeTitle}</h2>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live Clock */}
        <div className="topbar-clock">
          <Clock size={14} />
          <span>
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>

        {/* Quick Sale POS Shortcut */}
        {location.pathname !== '/sales' && (
          <button className="quick-action-btn" onClick={() => navigate('/sales')}>
            <ShoppingCart size={16} />
            <span>New Sale</span>
          </button>
        )}

        {/* Low Stock Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="notification-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            title="Stock alerts"
            aria-label="Stock alerts"
          >
            <Bell size={18} />
            {kpis.lowStockCount > 0 && (
              <span className="notification-badge">{kpis.lowStockCount}</span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '320px',
                background: 'white',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 60,
                padding: '0.875rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Stock Alerts ({lowStockProducts.length})
                </span>
                <button
                  className="btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/inventory');
                  }}
                >
                  Manage All
                </button>
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/inventory');
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-canvas)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          Threshold: {p.minStock} {p.unit}
                        </div>
                      </div>
                      <span
                        className={`badge ${p.stock <= 0 ? 'badge-danger' : 'badge-warning'}`}
                        style={{ flexShrink: 0 }}
                      >
                        {p.stock <= 0 ? 'Empty' : `${p.stock} left`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    All products are currently well-stocked.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
