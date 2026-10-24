import { Movie } from '../types/movie';
import { getPosterUrl } from '../lib/tmdb';
import { Film } from 'lucide-react';

interface PosterCardProps {
  movie: Movie;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
}

export default function PosterCard({ movie, onClick, onEdit }: PosterCardProps) {
  const posterUrl = getPosterUrl(movie.poster_path);
  const displayYear = movie.release_year ? ` (${movie.release_year})` : '';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface mb-2">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface">
            <Film className="w-12 h-12 text-secondary/50" />
          </div>
        )}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-accent/50 rounded-lg transition-colors pointer-events-none" />
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}
            className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded opacity-0 group-hover:opacity-100 transition-opacity text-secondary hover:text-accent"
            aria-label="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      <h3 className="text-sm font-medium text-primary truncate group-hover:text-accent transition-colors">
        {movie.title}
      </h3>
      {movie.release_year && (
        <p className="text-xs text-secondary mt-0.5">
          {movie.release_year}
        </p>
      )}
    </div>
  );
}
