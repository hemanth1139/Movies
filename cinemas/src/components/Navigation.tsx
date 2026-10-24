import { MediaType } from '../types/movie';

type FilterType = MediaType | 'All' | 'Anime';

interface NavigationProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const filters: FilterType[] = ['All', 'Movie', 'TV Series', 'Anime'];

export default function Navigation({ currentFilter, onFilterChange }: NavigationProps) {
  return (
    <nav className="border-b border-surface bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 py-3 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentFilter === filter
                  ? 'bg-accent text-background'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
