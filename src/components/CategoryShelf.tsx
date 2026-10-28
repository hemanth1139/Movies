import { memo, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Rows } from 'lucide-react';
import PosterGrid from './PosterGrid';
import type { Movie } from '../types/movie';
import type { WatchLogMap } from '../types/watchLog';

type ViewMode = 'grid' | 'list';

interface CategoryShelfProps {
  title: string;
  movies: Movie[];
  view: ViewMode;
  expanded: boolean;
  previewOnly: boolean;
  rail: boolean;
  showRanks: boolean;
  onToggle: () => void;
  onAddClick: () => void;
  onMovieEdit: (movie: Movie) => void;
  onMovieDelete: (movie: Movie) => void;
  onMovieOpen: (movie: Movie) => void;
  watchLog: WatchLogMap;
}

const CategoryShelf = function CategoryShelf({
  title,
  movies,
  view,
  expanded,
  rail,
  showRanks,
  onToggle,
  onAddClick,
  onMovieEdit,
  onMovieDelete,
  onMovieOpen,
  watchLog,
}: CategoryShelfProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // In rail mode, allow up to 36 movies so the horizontal carousel can be freely browsed
  const railMovies = movies.slice(0, 36);

  useEffect(() => {
    const element = railRef.current;
    if (!element || !rail || expanded) return;
    const update = () => {
      setCanScrollLeft(element.scrollLeft > 2);
      setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [rail, expanded, railMovies.length]);

  const scroll = (direction: -1 | 1) => {
    const element = railRef.current;
    if (element) {
      element.scrollBy({ left: direction * Math.min(800, element.clientWidth * 0.8), behavior: 'smooth' });
    }
  };

  const isShowingGrid = expanded;

  return (
    <section className="category-section" aria-label={`${title} titles`}>
      <div className="category-heading">
        <div>
          <h2>{title}</h2>
          <span>{movies.length} {movies.length === 1 ? 'title' : 'titles'}</span>
        </div>
        {movies.length > 5 && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1 px-2.5 rounded border border-white/10 bg-white/5"
            aria-label={isShowingGrid ? `Collapse ${title} to carousel` : `Show all ${movies.length} ${title} titles as grid`}
          >
            {isShowingGrid ? <Rows size={13} /> : <LayoutGrid size={13} />}
            <span>{isShowingGrid ? 'View as carousel' : `Explore all (${movies.length})`}</span>
          </button>
        )}
      </div>

      {rail && !isShowingGrid ? (
        <div className="category-rail-frame">
          <button
            type="button"
            className="category-rail-arrow left"
            aria-label={`Scroll ${title} left`}
            disabled={!canScrollLeft}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft />
          </button>
          <div className="category-rail-scroll" ref={railRef}>
            <PosterGrid
              movies={railMovies}
              view="grid"
              rail
              isEmptyCollection={false}
              hasActiveFilters={false}
              onAddClick={onAddClick}
              onMovieEdit={onMovieEdit}
              onMovieDelete={onMovieDelete}
              onMovieOpen={onMovieOpen}
              watchLog={watchLog}
              showRanks={showRanks}
            />
          </div>
          <button
            type="button"
            className="category-rail-arrow right"
            aria-label={`Scroll ${title} right`}
            disabled={!canScrollRight}
            onClick={() => scroll(1)}
          >
            <ChevronRight />
          </button>
        </div>
      ) : (
        <PosterGrid
          movies={movies}
          view={view}
          isEmptyCollection={false}
          hasActiveFilters={false}
          onAddClick={onAddClick}
          onMovieEdit={onMovieEdit}
          onMovieDelete={onMovieDelete}
          onMovieOpen={onMovieOpen}
          watchLog={watchLog}
        />
      )}
    </section>
  );
};

export default memo(CategoryShelf);
