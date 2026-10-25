import type { MediaType } from '../types/movie';

export type FilterType = MediaType | 'All';

interface NavigationProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const filters: Array<{ value: FilterType; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Movie', label: 'Movies' },
  { value: 'TV Series', label: 'Series' },
];

export default function Navigation({ currentFilter, onFilterChange }: NavigationProps) {
  return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Filter by type">
      {filters.map((filter) => {
        const selected = currentFilter === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onFilterChange(filter.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-wl ${
              selected
                ? 'bg-accent text-accent-text'
                : 'bg-surface-2 text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
