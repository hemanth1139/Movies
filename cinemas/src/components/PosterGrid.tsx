import { Movie } from '../types/movie';
import PosterCard from './PosterCard';

interface PosterGridProps {
  movies: Movie[];
  onMovieClick?: (movie: Movie) => void;
  onMovieEdit?: (movie: Movie, e: React.MouseEvent) => void;
}

export default function PosterGrid({ movies, onMovieClick, onMovieEdit }: PosterGridProps) {
  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-secondary text-lg">No titles found</p>
        <p className="text-secondary/60 text-sm mt-2">Try adjusting your filters or search</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {movies.map((movie) => (
        <PosterCard
          key={movie.id}
          movie={movie}
          onClick={() => onMovieClick?.(movie)}
          onEdit={(e) => onMovieEdit?.(movie, e)}
        />
      ))}
    </div>
  );
}
