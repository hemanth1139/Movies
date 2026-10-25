import { Clapperboard, Plus } from 'lucide-react';
import SearchBar from './SearchBar';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
}

export default function Header({ searchQuery, onSearchChange, onAddClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-7 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 sm:justify-start sm:min-w-[9.5rem]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-wl-sm bg-accent text-accent-text shadow-sm">
              <Clapperboard className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-primary">Watchlog</span>
          </div>
          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-wl-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-text shadow-sm transition-colors duration-wl hover:bg-accent/90 sm:hidden"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <SearchBar value={searchQuery} onChange={onSearchChange} />
        </div>

        <button
          type="button"
          onClick={onAddClick}
          className="hidden min-h-11 sm:inline-flex items-center gap-2 rounded-wl-sm bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text shadow-sm transition-colors duration-wl hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </header>
  );
}
