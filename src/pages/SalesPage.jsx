import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../layout/PageHeader';
import { ReceiptModal } from '../components/ReceiptModal';
import { Modal } from '../components/Modal';
import { formatCurrency } from '../utilities/formatters';
import { calculateCartTotals, calculateChange } from '../services/salesService';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Bookmark,
  CheckCircle,
  CreditCard,
  DollarSign,
  Smartphone,
  User,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const SalesPage = () => {
  const {
    products,
    categories,
    settings,
    parkedCarts,
    createSale,
    parkCart,
    resumeParkedCart,
    deleteParkedCart,
    showToast,
  } = useApp();

  // Active POS Catalog Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Active Cart State
  const [cartItems, setCartItems] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerFields, setShowCustomerFields] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash | Credit Card | Debit Card | Apple Pay
  const [cashTendered, setCashTendered] = useState('');

  // Modals
  const [completedSale, setCompletedSale] = useState(null);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);

  // Filter products for catalog
  const catalogProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'archived') return false;

      // Category filter
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(lower);
        const matchesSku = p.sku.toLowerCase().includes(lower);
        const matchesBarcode = p.barcode && p.barcode.toLowerCase().includes(lower);
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchTerm]);

  // Cart Calculations
  const totals = useMemo(() => {
    return calculateCartTotals(cartItems, discountPercent, settings.taxRate);
  }, [cartItems, discountPercent, settings.taxRate]);

  // Change Due calculation
  const changeDue = useMemo(() => {
    if (paymentMethod !== 'Cash') return 0;
    return calculateChange(cashTendered, totals.grandTotal);
  }, [paymentMethod, cashTendered, totals.grandTotal]);

  // Add Item to Cart
  const handleAddToCart = (product) => {
    if (product.stock <= 0 && settings.preventNegativeStock) {
      showToast({
        type: 'warning',
        title: 'Out of Stock',
        message: `${product.name} is currently out of stock.`,
      });
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (settings.preventNegativeStock && existing.quantity >= product.stock) {
          showToast({
            type: 'warning',
            title: 'Max Stock Reached',
            message: `Cannot add more than ${product.stock} available units of ${product.name}.`,
          });
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            price: product.sellingPrice,
            costPrice: product.costPrice,
            maxAvailable: product.stock,
            quantity: 1,
          },
        ];
      }
    });
  };

  // Update Item Quantity in Cart
  const handleUpdateQty = (productId, newQty) => {
    const qty = parseInt(newQty, 10);
    const prod = products.find((p) => p.id === productId);

    if (isNaN(qty) || qty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (settings.preventNegativeStock && prod && qty > prod.stock) {
      showToast({
        type: 'warning',
        title: 'Insufficient Inventory',
        message: `Only ${prod.stock} units available for this item.`,
      });
      return;
    }

    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  };

  // Remove Item from Cart
  const handleRemoveItem = (productId) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCartItems([]);
    setDiscountPercent(0);
    setCashTendered('');
  };

  // Park Cart
  const handleParkCart = () => {
    if (cartItems.length === 0) return;
    parkCart({
      items: cartItems,
      customerName,
      customerEmail,
      customerPhone,
      discountPercent,
    });
    handleClearCart();
    setCustomerName('Walk-in Customer');
  };

  // Resume Parked Cart
  const handleResumeParked = (cartId) => {
    const resumed = resumeParkedCart(cartId);
    if (resumed) {
      setCartItems(resumed.items || []);
      setCustomerName(resumed.customerName || 'Walk-in Customer');
      setCustomerEmail(resumed.customerEmail || '');
      setCustomerPhone(resumed.customerPhone || '');
      setDiscountPercent(resumed.discountPercent || 0);
      setIsParkedModalOpen(false);
    }
  };

  // Quick Cash Tender presets
  const handleQuickCash = (amount) => {
    setCashTendered(amount.toString());
  };

  // Complete Sale
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      showToast({ type: 'error', title: 'Cart Empty', message: 'Add at least one product to checkout.' });
      return;
    }

    if (paymentMethod === 'Cash') {
      const tendered = Number(cashTendered) || 0;
      if (tendered < totals.grandTotal) {
        showToast({
          type: 'error',
          title: 'Insufficient Cash',
          message: `Cash tendered (${formatCurrency(tendered, settings.currency)}) is less than total amount (${formatCurrency(totals.grandTotal, settings.currency)}).`,
        });
        return;
      }
    }

    const created = createSale({
      items: cartItems,
      customerName,
      customerEmail,
      customerPhone,
      discount: totals.discountAmount,
      subtotal: totals.subtotal,
      tax: totals.taxAmount,
      total: totals.grandTotal,
      paymentMethod,
      cashTendered: paymentMethod === 'Cash' ? Number(cashTendered) : totals.grandTotal,
      changeGiven: changeDue,
      cashier: 'NovaMart Register #1',
    });

    if (created) {
      setCompletedSale(created);
      handleClearCart();
      setCustomerName('Walk-in Customer');
      setCustomerEmail('');
      setCustomerPhone('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Point of Sale Register"
        subtitle="Process counter sales, manage live order cart, and print customer invoices."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {parkedCarts.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setIsParkedModalOpen(true)}>
                <Bookmark size={16} /> Parked Carts ({parkedCarts.length})
              </button>
            )}
            {cartItems.length > 0 && (
              <button className="btn btn-secondary" onClick={handleParkCart}>
                <Bookmark size={16} /> Hold / Park Sale
              </button>
            )}
          </div>
        }
      />

      <div className="pos-layout">
        {/* Left: Product Catalog Browser */}
        <div className="pos-catalog">
          <div className="pos-search-bar">
            <div className="search-box" style={{ maxWidth: '100%' }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="input"
                placeholder="Scan barcode or type product name / SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="pos-categories">
            <button
              className={`category-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All Items ({products.filter((p) => p.status !== 'archived').length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.categoryId === c.id && p.status !== 'archived').length;
              return (
                <button
                  key={c.id}
                  className={`category-pill ${selectedCategory === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="pos-products-grid">
            {catalogProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock <= p.minStock && !isOutOfStock;
              const inCart = cartItems.find((i) => i.productId === p.id);

              return (
                <div
                  key={p.id}
                  className={`product-pos-card ${isOutOfStock ? 'disabled' : ''}`}
                  onClick={() => !isOutOfStock && handleAddToCart(p)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="pos-card-sku">{p.sku}</span>
                      {inCart && (
                        <span className="badge badge-violet" style={{ fontSize: '0.6875rem' }}>
                          In Cart: {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <div className="pos-card-name" title={p.name}>
                      {p.name}
                    </div>
                  </div>

                  <div className="pos-card-footer">
                    <span className="pos-card-price price">
                      {formatCurrency(p.sellingPrice, settings.currency)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: isOutOfStock
                          ? 'var(--color-danger)'
                          : isLowStock
                          ? 'var(--color-warning)'
                          : 'var(--color-success)',
                      }}
                    >
                      {isOutOfStock ? 'Sold Out' : `${p.stock} in stock`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Order Cart & Register Panel */}
        <div className="pos-cart">
          <div className="pos-cart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} color="var(--color-primary)" />
              <strong style={{ fontSize: '0.9375rem' }}>Active Order</strong>
              <span className="badge badge-neutral">{cartItems.length} items</span>
            </div>

            {cartItems.length > 0 && (
              <button
                className="btn-ghost btn-sm"
                style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}
                onClick={handleClearCart}
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="pos-cart-items">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <div key={item.productId} className="cart-item-row">
                  <div className="cart-item-info">
                    <div className="cart-item-name" title={item.name}>
                      {item.name}
                    </div>
                    <div className="cart-item-price price">
                      {formatCurrency(item.price, settings.currency)} each
                    </div>
                  </div>

                  <div className="qty-control">
                    <button
                      className="qty-btn"
                      onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="text"
                      className="qty-input"
                      value={item.quantity}
                      onChange={(e) => handleUpdateQty(item.productId, e.target.value)}
                    />
                    <button
                      className="qty-btn"
                      onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="cart-item-subtotal price">
                    {formatCurrency(item.price * item.quantity, settings.currency)}
                  </div>

                  <button
                    className="btn-ghost"
                    style={{ color: 'var(--text-light)', padding: '2px' }}
                    onClick={() => handleRemoveItem(item.productId)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-light)',
                  gap: '0.75rem',
                }}
              >
                <ShoppingCart size={40} />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Cart is currently empty. Click on items to add.
                </p>
              </div>
            )}
          </div>

          {/* Cart Summary & Checkout */}
          <div className="pos-cart-summary">
            {/* Customer Toggle */}
            <div style={{ marginBottom: '0.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8125rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)' }}>
                  <User size={14} /> Customer: <strong style={{ color: 'var(--text-main)' }}>{customerName}</strong>
                </span>
                <button
                  className="btn-ghost btn-sm"
                  style={{ color: 'var(--color-primary)', fontSize: '0.75rem', padding: '0 4px' }}
                  onClick={() => setShowCustomerFields(!showCustomerFields)}
                >
                  {showCustomerFields ? 'Hide Details' : 'Change Details'}
                </button>
              </div>

              {showCustomerFields && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Customer Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                    <input
                      type="email"
                      className="input"
                      placeholder="Email Address"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                    <input
                      type="tel"
                      className="input"
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Subtotal, Discount & Tax */}
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="price">{formatCurrency(totals.subtotal, settings.currency)}</span>
            </div>

            <div className="summary-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                Order Discount:
                <select
                  className="select"
                  style={{ width: 'auto', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                </select>
              </span>
              <span className="price" style={{ color: totals.discountAmount > 0 ? 'var(--color-success)' : 'inherit' }}>
                -{formatCurrency(totals.discountAmount, settings.currency)}
              </span>
            </div>

            <div className="summary-row">
              <span>Sales Tax ({settings.taxRate}%)</span>
              <span className="price">{formatCurrency(totals.taxAmount, settings.currency)}</span>
            </div>

            <div className="summary-row total">
              <span>Total Due</span>
              <span className="price">{formatCurrency(totals.grandTotal, settings.currency)}</span>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                Payment Method
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem' }}>
                {['Cash', 'Credit Card', 'Debit Card', 'Apple Pay'].map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.6875rem', padding: '0.375rem 0.25rem' }}
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* If Cash: Tendered & Change calculator */}
            {paymentMethod === 'Cash' && (
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.625rem',
                  marginTop: '0.375rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Tendered:</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.6875rem', padding: '2px 6px' }}
                        onClick={() => handleQuickCash(amt)}
                      >
                        {settings.currency}{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.6875rem', padding: '2px 6px' }}
                      onClick={() => handleQuickCash(Math.ceil(totals.grandTotal))}
                    >
                      Exact
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Cash Given"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                  />
                  <div style={{ textAlign: 'right', minWidth: '90px' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Change Due</div>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: 'var(--color-success)',
                      }}
                      className="price"
                    >
                      {formatCurrency(changeDue, settings.currency)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={cartItems.length === 0}
              onClick={handleCheckout}
            >
              Complete Sale ({formatCurrency(totals.grandTotal, settings.currency)}) <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Parked Carts Modal */}
      <Modal
        isOpen={isParkedModalOpen}
        onClose={() => setIsParkedModalOpen(false)}
        title="Held / Parked Sales"
        size="md"
        footer={
          <button className="btn btn-secondary" onClick={() => setIsParkedModalOpen(false)}>
            Close
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {parkedCarts.length > 0 ? (
            parkedCarts.map((p) => {
              const count = p.items?.length || 0;
              const sub = p.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;

              return (
                <div
                  key={p.id}
                  style={{
                    padding: '0.875rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {count} items • Subtotal: {formatCurrency(sub, settings.currency)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => deleteParkedCart(p.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleResumeParked(p.id)}>
                      Resume Sale
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No held sales currently in queue.
            </div>
          )}
        </div>
      </Modal>

      {/* Checkout Receipt Modal */}
      <ReceiptModal
        isOpen={!!completedSale}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        onNewSale={() => setCompletedSale(null)}
      />
    </div>
  );
};
