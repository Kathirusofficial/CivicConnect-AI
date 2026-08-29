import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, AlertCircle } from 'lucide-react';

export const CATEGORIES = [
  { name: 'Electricity', icon: '⚡' },
  { name: 'Water Supply', icon: '💧' },
  { name: 'Road Damage', icon: '🛣' },
  { name: 'Garbage Collection', icon: '🗑' },
  { name: 'Traffic Signal', icon: '🚦' },
  { name: 'Street Light', icon: '💡' },
  { name: 'Drainage', icon: '🚰' },
  { name: 'Parks', icon: '🌳' },
  { name: 'Municipality', icon: '🏢' },
  { name: 'Others', icon: '📌' },
];

export const PRIORITIES = [
  { name: 'Low', icon: '🟢', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { name: 'Medium', icon: '🟡', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { name: 'High', icon: '🟠', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { name: 'Emergency', icon: '🔴', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
];

// Click Outside Hook
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

const dropdownStyle = {
  backgroundColor: '#1B1228',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 15px 40px rgba(124,58,237,.25)',
  borderRadius: '16px'
};

const triggerStyle = {
  backgroundColor: '#140C1F',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px'
};

export const CategorySelect = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const listRef = useRef(null);

  useOnClickOutside(ref, () => {
    setIsOpen(false);
    setSearchTerm('');
  });

  const filteredCategories = CATEGORIES.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) inputRef.current.focus();
      setFocusedIndex(0);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Ensure scroll follows focus
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.children[focusedIndex];
      if (activeElement && scrollRef.current) {
        // Only scroll if out of bounds
        const container = scrollRef.current;
        const eleTop = activeElement.offsetTop;
        const eleBottom = eleTop + activeElement.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        if (eleTop < containerTop) {
          container.scrollTop = eleTop;
        } else if (eleBottom > containerBottom) {
          container.scrollTop = eleBottom - container.offsetHeight;
        }
      }
    }
  }, [focusedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredCategories.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCategories[focusedIndex]) {
          onChange(filteredCategories[focusedIndex].name);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.name === value);

  return (
    <div className="relative w-full" ref={ref} onKeyDown={handleKeyDown}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #7C3AED, #9333EA); border-radius: 8px; }
      `}</style>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={triggerStyle}
        className={`w-full px-4 py-3 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-colors ${error ? 'border-red-500' : ''}`}
      >
        <span className={selectedCategory ? 'text-white font-medium flex items-center gap-2' : 'text-gray-400'}>
          {selectedCategory ? (
            <><span className="text-xl leading-none">{selectedCategory.icon}</span> {selectedCategory.name}</>
          ) : 'Select a category'}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 4 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full left-0 origin-top overflow-hidden"
            style={dropdownStyle}
          >
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search Category..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFocusedIndex(0);
                  }}
                  className="w-full bg-black/20 text-white placeholder-gray-500 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#7C3AED]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div ref={scrollRef} className="max-h-60 overflow-y-auto custom-scrollbar p-2">
              {filteredCategories.length > 0 ? (
                <ul ref={listRef} className="space-y-1">
                  {filteredCategories.map((cat, idx) => (
                    <li
                      key={cat.name}
                      onClick={() => { onChange(cat.name); setIsOpen(false); }}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      style={{ 
                        backgroundColor: value === cat.name ? '#9333EA' : focusedIndex === idx ? '#7C3AED' : 'transparent',
                        transform: focusedIndex === idx && value !== cat.name ? 'translateX(4px)' : 'translateX(0)',
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-white font-medium transition-all duration-200`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl leading-none">{cat.icon}</span>
                        {cat.name}
                      </div>
                      {value === cat.name && <Check size={16} className="text-white" />}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <AlertCircle size={24} className="text-[#7C3AED]" />
                  <p className="text-sm font-medium">No category found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PrioritySelect = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const ref = useRef(null);

  useOnClickOutside(ref, () => setIsOpen(false));

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, PRIORITIES.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        onChange(PRIORITIES[focusedIndex].name);
        setIsOpen(false);
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const selectedPriority = PRIORITIES.find(p => p.name === value);

  return (
    <div className="relative w-full" ref={ref} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={triggerStyle}
        className={`w-full px-4 py-3 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-colors ${error ? 'border-red-500' : ''}`}
      >
        <span className={selectedPriority ? 'text-white font-medium flex items-center gap-2' : 'text-gray-400'}>
          {selectedPriority ? (
            <span className={`flex items-center gap-2 px-2.5 py-1 ${selectedPriority.bg} border ${selectedPriority.border} ${selectedPriority.color} rounded-md text-sm font-semibold`}>
              <span className="text-base leading-none drop-shadow">{selectedPriority.icon}</span> {selectedPriority.name}
            </span>
          ) : 'Select priority'}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 4 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full left-0 origin-top p-2 overflow-hidden"
            style={dropdownStyle}
          >
            <ul className="space-y-1">
              {PRIORITIES.map((priority, idx) => (
                <li
                  key={priority.name}
                  onClick={() => { onChange(priority.name); setIsOpen(false); }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  style={{ 
                    backgroundColor: value === priority.name ? '#9333EA' : focusedIndex === idx ? '#7C3AED' : 'transparent',
                    transform: focusedIndex === idx && value !== priority.name ? 'translateX(4px)' : 'translateX(0)',
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200`}
                >
                  <div className="flex items-center gap-2">
                    {/* Render badge style inside dropdown too */}
                    <span className={`flex items-center gap-2 px-2.5 py-0.5 ${value === priority.name || focusedIndex === idx ? 'bg-white/10 text-white' : priority.bg + ' ' + priority.color} border ${priority.border} rounded-md text-sm font-semibold transition-colors`}>
                      <span className="text-base leading-none drop-shadow">{priority.icon}</span> {priority.name}
                    </span>
                  </div>
                  {value === priority.name && <Check size={16} className="text-white" />}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
