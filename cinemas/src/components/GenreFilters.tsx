import { GENRES, uniqueGenres } from '../lib/genres';
import type { Movie } from '../types/movie';

interface GenreFiltersProps {
  movies: Movie[];
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
}

export default function GenreFilters({ movies, selectedGenres, onGenreToggle }: GenreFiltersProps) {
  const collectionGenres = movies.flatMap((movie) => movie.genres);
  const genres = uniqueGenres([...GENRES, ...collectionGenres, ...selectedGenres]);

  return (
    <div className="chip-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto" role="group" aria-label="Filter by genre">
      {genres.map((genre) => {
        const selected = selectedGenres.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            aria-pressed={selected}
            onClick={() => onGenreToggle(genre)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
              selected
                ? 'bg-accent text-accent-text'
                : 'bg-surface-2 text-secondary hover:text-primary'
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
