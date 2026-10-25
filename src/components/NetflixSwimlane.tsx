import type { Movie } from '../types/movie';
import type { WatchLogMap } from '../types/watchLog';
import { Check, Film } from 'lucide-react';

interface NetflixSwimlaneProps {
  title: string;
  movies: Movie[];
  onCardClick: (movie: Movie) => void;
  watchLog: WatchLogMap;
}

export default function NetflixSwimlane({ title, movies, onCardClick, watchLog }: NetflixSwimlaneProps) {
  if (movies.length === 0) return null;

  return (
    <section className="netflix-swimlane" aria-label={title}>
      <h2 className="netflix-swimlane-title">{title}</h2>
      <div className="netflix-poster-grid">
        {movies.map((movie) => {
          const posterUrl = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : undefined;

          return (
            <button
              key={movie.id}
              type="button"
              className="netflix-card"
              aria-label={`Log a watch for ${movie.title}`}
              onClick={() => onCardClick(movie)}
            >
              {posterUrl ? <img src={posterUrl} alt={`${movie.title} poster`} className="netflix-card-image" loading="lazy" /> : (
                <span className="netflix-poster-placeholder" aria-hidden="true"><Film /><span>{movie.title}</span><small>{movie.type === 'TV Series' ? 'SERIES' : 'MOVIE'}</small></span>
              )}
              {movie.type === 'TV Series' && watchLog[movie.id]?.totalSeasons > 0 && (
                <span className="netflix-series-progress">{watchLog[movie.id].watchedSeasons.length} / {watchLog[movie.id].totalSeasons} seasons watched</span>
              )}
              <span className="netflix-card-metadata">
                <span className="netflix-card-actions"><span className="netflix-card-action-button netflix-card-action-watched"><Check size={15} /></span></span>
                <span className="netflix-card-meta-line">
                  <span className="netflix-card-type">{movie.type === 'TV Series' ? 'SERIES' : 'MOVIE'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{movie.release_date?.slice(0, 4) || movie.release_year || 'Year unknown'}</span>
                </span>
                <span className="netflix-card-genres">{movie.genres.slice(0, 3).join(' · ')}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
