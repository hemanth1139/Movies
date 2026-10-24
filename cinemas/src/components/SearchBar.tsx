import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export default function SearchBar({ isOpen, onClose, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      onSearch('');
    }
  }, [isOpen, onSearch]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, onSearch]);

  if (!isOpen) return null;

  return (
    <div className="border-b border-surface bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles..."
            className="w-full px-4 py-3 pl-4 pr-12 bg-surface text-primary placeholder:text-secondary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
