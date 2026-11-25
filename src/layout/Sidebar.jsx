import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  Boxes as BrandIcon,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Categories', path: '/categories', icon: Layers },
  { name: 'Inventory', path: '/inventory', icon: Boxes },
  { name: 'Sales (POS)', path: '/sales', icon: ShoppingCart },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const { kpis, settings } = useApp();

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-badge">
            <div className="brand-icon">
              <BrandIcon size={20} />
            </div>
            <div>
              <div className="brand-title">
                StockPilot <span className="brand-tag">SaaS</span>
              </div>
              <div className="brand-subtitle">{settings.tagline}</div>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="nav-section-title">Operations Menu</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isInventory = item.name === 'Inventory';
            const showWarning = isInventory && kpis.lowStockCount > 0;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <Icon size={18} />
                <span>{item.name}</span>

                {showWarning && (
                  <span className="nav-item-badge alert">
                    {kpis.lowStockCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="store-card">
            <div className="store-avatar">NM</div>
            <div className="store-details">
              <div className="store-name" title={settings.storeName}>
                {settings.storeName}
              </div>
              <div className="store-status">
                <span className="store-status-dot" />
                <span>Live Retail Terminal</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
