import React from 'react';

export const KpiCard = ({
  label,
  value,
  icon: Icon,
  variant = 'violet', // violet | blue | orange | green | red
  delta,
  deltaType = 'positive', // positive | negative | warning
  subtitle,
}) => {
  return (
    <div className={`kpi-card variant-${variant}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {Icon && (
          <div className={`kpi-icon-wrap ${variant}`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="kpi-value tabular">{value}</div>

      {(delta !== undefined || subtitle) && (
        <div className="kpi-footer">
          {delta && (
            <span className={`kpi-delta ${deltaType}`}>
              {delta}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
