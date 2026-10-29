import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  detail?: string;
  badge?: string;
  badgeColor?: 'orange' | 'green' | 'blue' | 'purple' | 'red';
  icon?: LucideIcon;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | DropdownOption)[];
  placeholder?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  icon: LeftIcon,
  disabled = false,
  className = '',
  style,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === 'string'
      ? { value: opt, label: opt }
      : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
        const nextIndex = currentIndex < normalizedOptions.length - 1 ? currentIndex + 1 : 0;
        onChange(normalizedOptions[nextIndex].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : normalizedOptions.length - 1;
        onChange(normalizedOptions[prevIndex].value);
      }
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`crm-custom-dropdown ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      style={style}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="crm-dropdown-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        tabIndex={0}
      >
        <div className="crm-dropdown-trigger-left">
          {LeftIcon && <LeftIcon size={16} className="crm-dropdown-icon" />}
          <span className={`crm-dropdown-label ${!selectedOption?.value ? 'is-placeholder' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={15} className={`crm-dropdown-arrow ${isOpen ? 'is-open' : ''}`} />
      </button>

      {isOpen && (
        <div className="crm-dropdown-menu" ref={listRef} role="listbox">
          <div className="crm-dropdown-scroll">
            {normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              const OptIcon = opt.icon;
              return (
                <div
                  key={opt.value}
                  className={`crm-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="crm-dropdown-item-content">
                    {OptIcon && <OptIcon size={15} className="crm-dropdown-item-icon" />}
                    <div className="crm-dropdown-item-text">
                      <span className="crm-dropdown-item-title">{opt.label}</span>
                      {opt.detail && <small className="crm-dropdown-item-detail">{opt.detail}</small>}
                    </div>
                  </div>

                  <div className="crm-dropdown-item-right">
                    {opt.badge && (
                      <span className={`crm-dropdown-badge ${opt.badgeColor || 'orange'}`}>
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="crm-dropdown-check" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

