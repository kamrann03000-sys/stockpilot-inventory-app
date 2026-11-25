import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { storageService } from '../services/storageService';
import { exportToCSV } from '../utilities/csv';
import {
  Settings as SettingsIcon,
  Store,
  ShieldCheck,
  Database,
  RotateCcw,
  Download,
  Upload,
  Save,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export const SettingsPage = () => {
  const {
    settings,
    products,
    categories,
    sales,
    movements,
    updateSettings,
    resetToDemo,
    importBackup,
    showToast,
  } = useApp();

  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    storeName: settings.storeName || 'NovaMart Retail Store',
    tagline: settings.tagline || 'Smart Inventory. Better Business.',
    currency: settings.currency || '$',
    taxRate: settings.taxRate || 8.0,
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
    receiptFooter: settings.receiptFooter || '',
    defaultMinStock: settings.defaultMinStock || 10,
    preventNegativeStock: settings.preventNegativeStock ?? true,
    skuPrefix: settings.skuPrefix || 'NVM-',
  });

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Storage metrics
  const storageUsageKB = storageService.getStorageUsage();

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings(formData);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backup = storageService.exportDatabaseBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `stockpilot_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'Backup Downloaded',
      message: 'Complete database snapshot exported to JSON.',
    });
  };

  // Import JSON Backup
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (content) {
          importBackup(content);
        }
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Import Error',
          message: 'Failed to read backup file.',
        });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div>
      <PageHeader
        title="Settings & System Management"
        subtitle="Configure store profile, regional currency, tax rates, inventory constraints, and data backups."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Store Profile & Inventory Rules Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Store Profile Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Store size={18} color="var(--color-primary)" /> Store Profile & Branding
                </h3>
                <p className="card-subtitle">Public details printed on customer receipts and invoices</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Store Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Brand Tagline</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Currency Symbol</label>
                  <select
                    className="select"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="$">$ (USD / CAD / AUD)</option>
                    <option value="€">€ (Euro)</option>
                    <option value="£">£ (British Pound)</option>
                    <option value="¥">¥ (JPY / CNY)</option>
                    <option value="₹">₹ (Indian Rupee)</option>
                    <option value="R$">R$ (Brazilian Real)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sales Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="input"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Store Physical Address</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Support Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Footer Note</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                />
              </div>

              {/* Inventory Business Rules */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} color="var(--color-success)" /> Inventory Business Rules
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Default Reorder Point</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={formData.defaultMinStock}
                      onChange={(e) => setFormData({ ...formData, defaultMinStock: parseInt(e.target.value) || 10 })}
                    />
                    <span className="form-hint">Applied to newly created products</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Auto-SKU Prefix</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.skuPrefix}
                      onChange={(e) => setFormData({ ...formData, skuPrefix: e.target.value })}
                    />
                    <span className="form-hint">Default code prefix for generation</span>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.preventNegativeStock}
                      onChange={(e) => setFormData({ ...formData, preventNegativeStock: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontWeight: 600 }}>Strict Inventory Protection (Prevent Negative Stock)</span>
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1.625rem', marginTop: '0.125rem' }}>
                    Blocks POS sales or deductions if requested quantity exceeds verified on-hand stock.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Database Health, Backups, and Reset */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Storage Telemetry Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <HardDrive size={18} color="var(--color-blue)" /> Local Storage Telemetry
                </h3>
                <p className="card-subtitle">Client-side persistence health</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Storage Used</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{storageUsageKB} KB</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Schema Version</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>v1.0 (Active)</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Catalog Items</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{products.length} Products</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Audit Log Entries</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{movements.length} Movements</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> All database entities synchronized to browser storage
            </div>
          </div>

          {/* Backup & Restore Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Database size={18} color="var(--color-primary)" /> Backup & Data Portability
                </h3>
                <p className="card-subtitle">Export or restore your full store database</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleExportBackup}>
                <Download size={16} /> Export Complete JSON Backup
              </button>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
              />

              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} /> Restore Database from JSON
              </button>
            </div>
          </div>

          {/* Danger Zone: Reset to Demo Seed */}
          <div className="card" style={{ border: '1px solid #FECACA', background: '#FEF2F2' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ color: 'var(--color-danger)' }}>
                  <RotateCcw size={18} /> Reset Demo Data
                </h3>
                <p className="card-subtitle" style={{ color: '#B91C1C' }}>
                  Restore original NovaMart seed dataset (8 categories, 22 products, 12 sales)
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#991B1B', lineHeight: '1.4', marginBottom: '1rem' }}>
              This will overwrite current local storage with the initial pristine NovaMart seed data. Ideal for exploring and demonstrating features.
            </p>

            <button
              className="btn btn-danger"
              style={{ width: '100%' }}
              onClick={() => setIsResetConfirmOpen(true)}
            >
              Reset to NovaMart Demo Seed
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetToDemo}
        title="Reset to Demo Seed Data"
        message="Are you sure you want to reset StockPilot? All custom additions and modifications will be replaced with the default NovaMart retail dataset."
        confirmText="Yes, Reset Database"
        danger={true}
      />
    </div>
  );
};
