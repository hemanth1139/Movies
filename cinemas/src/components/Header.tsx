import { Film, Search, Plus } from 'lucide-react';

interface HeaderProps {
  onSearchClick: () => void;
  onAddClick: () => void;
}

export default function Header({ onSearchClick, onAddClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Film className="w-8 h-8 text-accent" />
            <h1 className="text-2xl font-bold text-primary tracking-tight">CINEMAS</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSearchClick}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-secondary hover:text-primary"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Title</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
