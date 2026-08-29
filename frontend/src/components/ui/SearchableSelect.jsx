import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, MapPin, X } from 'lucide-react';

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  disabledPlaceholder = 'Disabled',
  error = null,
  icon = MapPin
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef(null);
  const searchInputRef = useRef(null);
  const IconComponent = icon;

  useOnClickOutside(ref, () => {
    setIsOpen(false);
    setSearchTerm('');
  });

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-all duration-200 ${
          disabled
            ? 'bg-surface-900/40 border border-surface-800 text-surface-500 cursor-not-allowed'
            : isOpen
            ? 'bg-surface-900 border-brand-500 ring-1 ring-brand-500/50 text-white shadow-glow-sm'
            : 'bg-surface-900/80 border border-surface-700/70 text-white hover:border-surface-600'
        } ${error ? 'border-red-500' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {IconComponent && (
            <IconComponent size={14} className={disabled ? 'text-surface-600' : value ? 'text-brand-400' : 'text-surface-500'} />
          )}
          <span className={`truncate ${value ? 'text-white font-medium' : 'text-surface-500'}`}>
            {disabled ? disabledPlaceholder : value || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-surface-400">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-md hover:bg-surface-800 hover:text-white transition-colors"
              title="Clear selection"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-400' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 left-0 right-0 mt-1.5 p-2 rounded-xl bg-surface-900 border border-surface-700/80 shadow-2xl backdrop-blur-xl max-h-60 flex flex-col"
          >
            {/* Search Input */}
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-950/80 border border-surface-700/60 rounded-lg text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-44 space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-surface-700 scrollbar-track-transparent">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-600/30 text-brand-300 font-semibold border border-brand-500/30'
                          : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check size={12} className="text-brand-400 shrink-0 ml-2" />}
                    </button>
                  );
                })
              ) : (
                <div className="py-4 text-center text-surface-500 text-xs">
                  No matching options found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
