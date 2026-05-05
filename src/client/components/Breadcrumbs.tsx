import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
          {item.href && i < items.length - 1 ? (
            <Link to={item.href} className="breadcrumb-item">{item.label}</Link>
          ) : (
            <span
              className={i === items.length - 1 ? 'breadcrumb-current' : 'breadcrumb-item'}
              aria-current={i === items.length - 1 ? 'page' : undefined}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
