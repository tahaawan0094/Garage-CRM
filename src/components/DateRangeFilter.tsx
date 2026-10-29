import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, Check, Calendar } from 'lucide-react';

export type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilterValue {
  type: DateFilterType;
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string;   // Format: YYYY-MM-DD
}

/**
 * Flexible date parser for all date formats used across the Garage CRM:
 * - ISO string: 2026-10-29T10:15:00.000Z
 * - Formatted date time: "28 Oct 2026, 16:38"
 * - Date string: "28 Oct 2026" or "14 Apr 2025"
 * - Slash date: "28/10/2026" or "14/04/2025"
 * - Dash date: "2026-10-28"
 * - Timestamp number or Date instance
 */
export function parseRecordDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(val).trim();
  if (!s) return null;

  // Try standard parse
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return new Date(parsed);

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }

  // Match YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
  }

  return null;
}

/**
 * Check if a date string/number/Date matches the active DateFilterValue
 */
export function matchesDateFilter(dateVal: any, filter: DateFilterValue): boolean {
  if (!filter || filter.type === 'all') return true;
  if (!dateVal) return false;

  const d = parseRecordDate(dateVal);
  if (!d || isNaN(d.getTime())) return false;

  const now = new Date();

  const startOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  const endOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(23, 59, 59, 999);
    return c;
  };

  if (filter.type === 'today') {
    return d >= startOfDay(now) && d <= endOfDay(now);
  }

  if (filter.type === 'yesterday') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return d >= startOfDay(y) && d <= endOfDay(y);
  }

  if (filter.type === 'week') {
    // Current calendar week (Monday to Sunday) or last 7 days
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return d >= startOfDay(monday) && d <= endOfDay(sunday);
  }

  if (filter.type === 'month') {
    // Current month (1st of month to last day of month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return d >= startOfDay(monthStart) && d <= endOfDay(monthEnd);
  }

  if (filter.type === 'custom') {
    const s = filter.startDate ? startOfDay(new Date(filter.startDate)) : null;
    const e = filter.endDate ? endOfDay(new Date(filter.endDate)) : null;
    if (s && e) return d >= s && d <= e;
    if (s) return d >= s;
    if (e) return d <= e;
    return true;
  }

  return true;
}

export interface DateRangeFilterProps {
  value: DateFilterValue;
  onChange: (val: DateFilterValue) => void;
  labelPrefix?: string;
  className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  labelPrefix,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(value.type === 'custom');
  const [customStart, setCustomStart] = useState(value.startDate || '');
  const [customEnd, setCustomEnd] = useState(value.endDate || '');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 270,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.startDate) setCustomStart(value.startDate);
    if (value.endDate) setCustomEnd(value.endDate);
    if (value.type === 'custom') setShowCustomInputs(true);
  }, [value.startDate, value.endDate, value.type]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownWidth = 270;
        const estimatedHeight = showCustomInputs ? 360 : 250;
        const spaceBelow = window.innerHeight - rect.bottom;

        let top = rect.bottom + 6;
        if (spaceBelow < estimatedHeight && rect.top > spaceBelow) {
          top = Math.max(10, rect.top - estimatedHeight - 6);
        }

        let left = rect.left;
        if (left + dropdownWidth > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - dropdownWidth - 12);
        }

        setDropdownPosition({
          top,
          left,
          width: dropdownWidth,
        });
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, showCustomInputs]);

  // Click outside and escape handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(targetNode) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(targetNode)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatShortDate = (isoDateStr?: string) => {
    if (!isoDateStr) return '';
    try {
      const parts = isoDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
    } catch {}
    return isoDateStr;
  };

  const getDisplayLabel = () => {
    switch (value.type) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'custom':
        if (value.startDate && value.endDate) {
          return `${formatShortDate(value.startDate)} – ${formatShortDate(value.endDate)}`;
        }
        if (value.startDate) return `From ${formatShortDate(value.startDate)}`;
        if (value.endDate) return `Until ${formatShortDate(value.endDate)}`;
        return 'Custom Range';
      case 'all':
      default:
        return labelPrefix ? `${labelPrefix} (All)` : 'All Dates';
    }
  };

  const handleSelectType = (type: DateFilterType) => {
    if (type === 'custom') {
      setShowCustomInputs(true);
      return;
    }
    setShowCustomInputs(false);
    onChange({ type });
    setIsOpen(false);
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customStart && !customEnd) {
      onChange({ type: 'all' });
    } else {
      onChange({
        type: 'custom',
        startDate: customStart,
        endDate: customEnd || customStart,
      });
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ type: 'all' });
    setCustomStart('');
    setCustomEnd('');
    setShowCustomInputs(false);
    setIsOpen(false);
  };

  const isActive = value.type !== 'all';

  return (
    <div
      className={`crm-date-filter-container ${isOpen ? 'is-open' : ''} ${className}`}
      ref={containerRef}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        className="crm-date-filter-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Filter by date range"
        title={getDisplayLabel()}
      >
        <CalendarDays size={14} className="crm-date-filter-icon" />
        <span className="crm-date-filter-label">{getDisplayLabel()}</span>
        <ChevronDown size={13} className={`crm-date-filter-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="crm-date-filter-dropdown portal-dropdown"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 9999999,
            }}
            role="dialog"
            aria-label="Select date filter"
          >
            <div className="crm-date-filter-header">
              <span>Filter by Date</span>
              {isActive && (
                <button type="button" className="crm-date-filter-reset-link" onClick={handleClear}>
                  Clear All
                </button>
              )}
            </div>

            <div className="crm-date-filter-options">
              <button
                type="button"
                className={`crm-date-option-item ${value.type === 'today' ? 'selected' : ''}`}
                onClick={() => handleSelectType('today')}
              >
                <span>Today</span>
                {value.type === 'today' && <Check size={14} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`crm-date-option-item ${value.type === 'yesterday' ? 'selected' : ''}`}
                onClick={() => handleSelectType('yesterday')}
              >
                <span>Yesterday</span>
                {value.type === 'yesterday' && <Check size={14} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`crm-date-option-item ${value.type === 'week' ? 'selected' : ''}`}
                onClick={() => handleSelectType('week')}
              >
                <span>This Week</span>
                {value.type === 'week' && <Check size={14} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`crm-date-option-item ${value.type === 'month' ? 'selected' : ''}`}
                onClick={() => handleSelectType('month')}
              >
                <span>This Month</span>
                {value.type === 'month' && <Check size={14} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`crm-date-option-item ${value.type === 'all' ? 'selected' : ''}`}
                onClick={() => handleSelectType('all')}
              >
                <span>All Dates</span>
                {value.type === 'all' && <Check size={14} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`crm-date-option-item ${value.type === 'custom' || showCustomInputs ? 'selected' : ''}`}
                onClick={() => setShowCustomInputs(!showCustomInputs)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} style={{ color: '#ff631c' }} />
                  <span>Custom Date Range...</span>
                </div>
                {value.type === 'custom' && <Check size={14} className="check-icon" />}
              </button>
            </div>

            {showCustomInputs && (
              <div className="crm-date-custom-section">
                <div className="crm-date-custom-title">
                  <span>Pick Date Range</span>
                </div>
                <form onSubmit={handleApplyCustom} className="crm-date-custom-form">
                  <div className="crm-date-inputs-row">
                    <div className="crm-date-input-group">
                      <label>From</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        max={customEnd || undefined}
                      />
                    </div>
                    <div className="crm-date-input-group">
                      <label>To</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart || undefined}
                      />
                    </div>
                  </div>
                  <div className="crm-date-custom-actions">
                    <button
                      type="button"
                      className="crm-date-btn-secondary"
                      onClick={() => setShowCustomInputs(false)}
                    >
                      Collapse
                    </button>
                    <button
                      type="submit"
                      className="crm-date-btn-primary"
                      disabled={!customStart && !customEnd}
                    >
                      Apply Range
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
