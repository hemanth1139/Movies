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
  const activeIndex = filters.findIndex((filter) => filter.value === currentFilter);

  return (
    <div className="type-tabs relative grid w-[15rem] shrink-0 grid-cols-3 rounded-full border border-border bg-surface p-1" role="group" aria-label="Filter by type">
      <span className="type-indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} aria-hidden="true" />
      {filters.map((filter, index) => {
        const selected = currentFilter === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onFilterChange(filter.value)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`relative z-10 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-wl ${
              selected
                ? 'text-white'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
