import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      const searchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (searchShortcut || (event.key === '/' && !editing && !event.metaKey && !event.ctrlKey && !event.altKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  return (
    <div className="search-shell relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search your library..."
        aria-label="Search titles"
        className="search-input w-full rounded-full border border-border bg-surface/70 py-2.5 pl-10 pr-16 text-sm text-primary placeholder:text-secondary/70 transition-all hover:bg-surface-hover focus:border-accent/40"
      />
      {!value && <kbd className="search-shortcut pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-secondary">⌘ K</kbd>}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:text-primary"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
