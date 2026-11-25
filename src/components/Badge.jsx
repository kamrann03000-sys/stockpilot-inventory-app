import React from 'react';

export const Badge = ({ children, variant = 'neutral', dot = true, className = '' }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export const StockBadge = ({ stock, minStock }) => {
  const numStock = Number(stock) || 0;
  const numMin = Number(minStock) || 0;

  if (numStock <= 0) {
    return <Badge variant="danger">Out of Stock</Badge>;
  }
  if (numStock <= numMin) {
    return <Badge variant="warning">Low Stock ({numStock})</Badge>;
  }
  return <Badge variant="success">In Stock ({numStock})</Badge>;
};

export const TransactionBadge = ({ status }) => {
  if (status === 'Completed') {
    return <Badge variant="success">Completed</Badge>;
  }
  if (status === 'Refunded') {
    return <Badge variant="danger">Refunded</Badge>;
  }
  return <Badge variant="neutral">{status}</Badge>;
};

export const MovementBadge = ({ type }) => {
  switch (type) {
    case 'IN':
      return <Badge variant="success">Stock In</Badge>;
    case 'OUT':
      return <Badge variant="danger">Stock Out</Badge>;
    case 'ADJUSTMENT':
      return <Badge variant="blue">Adjustment</Badge>;
    case 'SALE':
      return <Badge variant="violet">Sale</Badge>;
    case 'RETURN':
      return <Badge variant="warning">Return</Badge>;
    default:
      return <Badge variant="neutral">{type}</Badge>;
  }
};
