import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GENRES, uniqueGenres } from '../lib/genres';
import type { Movie } from '../types/movie';

interface GenreFiltersProps {
  movies: Movie[];
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  excludeAnime?: boolean;
}

export default function GenreFilters({ movies, selectedGenres, onGenreToggle, excludeAnime = false }: GenreFiltersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const collectionGenres = movies.flatMap((movie) => movie.genres);
  const genres = uniqueGenres([...GENRES, ...collectionGenres, ...selectedGenres])
    .filter((genre) => !excludeAnime || genre.toLowerCase() !== 'anime');

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateScrollState = () => {
      setCanScrollLeft(element.scrollLeft > 1);
      setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    };
    updateScrollState();
    element.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [genres.length]);

  return (
    <div className="genre-scroll-shell">
      <button type="button" className="genre-scroll-arrow" disabled={!canScrollLeft} aria-label="Scroll genres left" onClick={() => scrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <div
        ref={scrollRef}
        className="chip-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
        role="group"
        aria-label="Filter by genre"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.currentTarget.scrollLeft += event.deltaY;
            event.preventDefault();
          }
        }}
      >
        {genres.map((genre, index) => {
        const selected = selectedGenres.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            style={{ animationDelay: `${index * 50}ms` }}
            aria-pressed={selected}
            onClick={() => onGenreToggle(genre)}
            className={`genre-chip shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] ${
              selected
                ? 'border-white/20 bg-surface-2 text-primary'
                : 'border-border bg-surface text-secondary hover:border-accent/50 hover:text-accent'
            }`}
          >
            {genre}
          </button>
        );
        })}
      </div>
      <button type="button" className="genre-scroll-arrow" disabled={!canScrollRight} aria-label="Scroll genres right" onClick={() => scrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}>
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
