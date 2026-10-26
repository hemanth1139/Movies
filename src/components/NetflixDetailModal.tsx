import { useEffect } from 'react';
import type { Movie } from '../types/movie';
import { Pencil, X } from 'lucide-react';

interface NetflixDetailModalProps {
  movie: Movie;
  rating: number;
  watchedDate: string;
  review: string;
  onClose: () => void;
  onEdit?: (movie: Movie) => void;
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  return `${'★'.repeat(fullStars)}${halfStar ? '½' : ''}` || 'Not rated';
}

export default function NetflixDetailModal({ movie, rating, watchedDate, review, onClose, onEdit }: NetflixDetailModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const cleanDate = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
      const date = new Date(cleanDate);
      if (Number.isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const imagePath = movie.backdrop_path || movie.poster_path;
  const backdropUrl = imagePath
    ? `https://image.tmdb.org/t/p/original${imagePath}`
    : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=80';

  const universeName = movie.universe || movie.franchise || 'Standalone';

  return (
    <div className="netflix-modal-backdrop" onClick={onClose}>
      <section className="netflix-modal" role="dialog" aria-modal="true" aria-labelledby="netflix-modal-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="netflix-modal-close" aria-label="Close details"><X size={24} /></button>
        <div className="netflix-modal-banner" style={{ backgroundImage: `url(${backdropUrl})` }}>
          <div className="netflix-modal-banner-gradient" />
        </div>
        <div className="netflix-modal-content">
          <div className="netflix-modal-left">
            <h2 id="netflix-modal-title" className="netflix-modal-title">{movie.title}</h2>
            <div className="netflix-modal-rating-display">
              <strong className="netflix-modal-stars">{renderStars(rating)}</strong>
              <span>·</span>
              <span>{watchedDate ? `Watched on ${formatDate(watchedDate)}` : 'Watch date not set'}</span>
            </div>

            <div className="mb-4">
              <h3 className="netflix-modal-label">YOUR NOTES</h3>
              <div className="netflix-modal-review-box">{review || 'No personal notes added yet.'}</div>
            </div>

            {onEdit && (
              <button
                type="button"
                className="netflix-primary-button mt-4"
                onClick={() => {
                  onClose();
                  onEdit(movie);
                }}
              >
                <Pencil size={16} /> Edit Watch Log
              </button>
            )}
          </div>
          <div className="netflix-modal-right">
            <div className="detail-field">
              <h3 className="netflix-modal-label">MEDIA TYPE</h3>
              <span className="detail-type-pill">{movie.original_language === 'ja' ? 'ANIME' : movie.type === 'Movie' ? 'MOVIE' : 'TV SERIES'}</span>
            </div>
            <div className="detail-field">
              <h3 className="netflix-modal-label">RELEASE YEAR</h3>
              <span>{movie.release_date?.slice(0, 4) || movie.release_year || '—'}</span>
            </div>
            <div className="detail-field">
              <h3 className="netflix-modal-label">UNIVERSE</h3>
              <span>{universeName}</span>
            </div>
            <div className="detail-field">
              <h3 className="netflix-modal-label">GENRES</h3>
              <div className="netflix-modal-genres">
                {movie.genres.map((genre) => <span key={genre} className="netflix-modal-genre-tag">{genre}</span>)}
              </div>
            </div>
            <div className="detail-field">
              <h3 className="netflix-modal-label">OVERVIEW</h3>
              <p>{movie.overview || 'No overview available.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
