import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  favoriteIds: string[];
  onFavoriteToggle: (movieId: string) => void;
}

export default function CategoryShelf({ title, movies, view, expanded, previewOnly, rail, showRanks, onToggle, onAddClick, onMovieEdit, onMovieDelete, onMovieOpen, watchLog, favoriteIds, onFavoriteToggle }: CategoryShelfProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visibleMovies = showRanks || !previewOnly || expanded ? movies : movies.slice(0, 8);
  useEffect(() => {
    const element = railRef.current;
    if (!element || !rail) return;
    const update = () => {
      setCanScrollLeft(element.scrollLeft > 1);
      setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', update); observer.disconnect(); };
  }, [rail, visibleMovies.length]);
  const scroll = (direction: -1 | 1) => {
    const element = railRef.current;
    if (element) element.scrollBy({ left: direction * Math.min(1000, element.clientWidth * 0.85), behavior: 'smooth' });
  };
  return (
    <section className="category-section" aria-label={`${title} titles`}>
      <div className="category-heading">
        <div><h2>{title}</h2><span>{movies.length} {movies.length === 1 ? 'title' : 'titles'}</span></div>
        {previewOnly && !showRanks && movies.length > 8 && <button type="button" onClick={onToggle}>{expanded ? 'Show less' : 'Show all'}</button>}
      </div>
      {rail ? <div className="category-rail-frame">
        <button type="button" className="category-rail-arrow left" aria-label={`Scroll ${title} left`} disabled={!canScrollLeft} onClick={() => scroll(-1)}><ChevronLeft /></button>
        <div className="category-rail-scroll" ref={railRef}>
          <PosterGrid movies={visibleMovies} view="grid" rail isEmptyCollection={false} hasActiveFilters={false} onAddClick={onAddClick} onMovieEdit={onMovieEdit} onMovieDelete={onMovieDelete} onMovieOpen={onMovieOpen} watchLog={watchLog} favoriteIds={favoriteIds} onFavoriteToggle={onFavoriteToggle} showRanks={showRanks} />
        </div>
        <button type="button" className="category-rail-arrow right" aria-label={`Scroll ${title} right`} disabled={!canScrollRight} onClick={() => scroll(1)}><ChevronRight /></button>
      </div> : <PosterGrid movies={visibleMovies} view={view} isEmptyCollection={false} hasActiveFilters={false} onAddClick={onAddClick} onMovieEdit={onMovieEdit} onMovieDelete={onMovieDelete} onMovieOpen={onMovieOpen} watchLog={watchLog} favoriteIds={favoriteIds} onFavoriteToggle={onFavoriteToggle} />}
    </section>
  );
}
