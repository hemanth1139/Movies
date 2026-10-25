import { Clapperboard, Plus } from 'lucide-react';
import type { Movie } from '../types/movie';
import PosterCard from './PosterCard';

interface PosterGridProps {
  movies: Movie[];
  view: 'grid' | 'list';
  isEmptyCollection: boolean;
  hasActiveFilters: boolean;
  onAddClick: () => void;
  onMovieEdit?: (movie: Movie) => void;
  onMovieDelete?: (movie: Movie) => void;
}

export function SkeletonGrid({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-wl bg-surface p-2.5">
            <div className="poster-skeleton h-16 w-11 rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="poster-skeleton h-4 w-2/3 rounded" />
              <div className="poster-skeleton h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index}>
          <div className="poster-skeleton mb-2.5 aspect-[2/3] rounded-wl" />
          <div className="poster-skeleton h-4 w-4/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function PosterGrid({
  movies,
  view,
  isEmptyCollection,
  hasActiveFilters,
  onAddClick,
  onMovieEdit,
  onMovieDelete,
}: PosterGridProps) {
  if (isEmptyCollection) {
    return (
      <div className="flex flex-col items-center justify-center rounded-wl border border-dashed border-border px-6 py-20 text-center">
        <Clapperboard className="mb-4 h-10 w-10 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-primary">Your watchlog is empty</h2>
        <p className="mt-2 max-w-sm text-sm text-secondary">
          Add the first movie or series you have watched. Posters will show up here.
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="mt-5 inline-flex items-center gap-1.5 rounded-wl-sm bg-accent px-4 py-2.5 text-sm font-medium text-accent-text hover:opacity-90 transition-opacity duration-wl"
        >
          <Plus className="h-4 w-4" />
          Add a title
        </button>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-primary">No titles match this view</p>
        <p className="mt-2 text-sm text-secondary">
          {hasActiveFilters ? 'Try clearing search or filters.' : 'Nothing to show yet.'}
        </p>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {movies.map((movie, index) => (
          <PosterCard
            key={movie.id}
            movie={movie}
            variant="list"
            style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
            onEdit={onMovieEdit}
            onDelete={onMovieDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie, index) => (
        <PosterCard
          key={movie.id}
          movie={movie}
          variant="grid"
          style={{ animationDelay: `${Math.min(index * 65, 520)}ms` }}
          onEdit={onMovieEdit}
          onDelete={onMovieDelete}
        />
      ))}
    </div>
  );
}
