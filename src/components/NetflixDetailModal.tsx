import type { Movie } from '../types/movie';
import { X } from 'lucide-react';

interface NetflixDetailModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function NetflixDetailModal({ movie, onClose }: NetflixDetailModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalfStar) stars += '½';
    return stars;
  };

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : movie.poster_path
    ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=80';

  return (
    <div className="netflix-modal-backdrop" onClick={onClose}>
      <div className="netflix-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="netflix-modal-close"
        >
          <X size={24} />
        </button>

        <div
          className="netflix-modal-banner"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          <div className="netflix-modal-banner-gradient" />
        </div>

        <div className="netflix-modal-content">
          <div className="netflix-modal-left">
            <h2 className="netflix-modal-title">{movie.title}</h2>

            <div className="netflix-modal-rating-display">
              <span className="netflix-modal-stars">
                {renderStars(4.5)}
              </span>
              <span style={{ color: '#B3B3B3' }}>•</span>
              <span style={{ color: '#B3B3B3' }}>
                Watched on {formatDate(movie.created_at)}
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 className="netflix-modal-label">YOUR REVIEW</h4>
              <div className="netflix-modal-review-box">
                {movie.overview || 'No review added yet.'}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 className="netflix-modal-label">STAR RATING</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="netflix-modal-star-button"
                    style={{
                      backgroundColor: star <= 4 ? '#E50914' : '#2F2F2F',
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <button className="netflix-add-button">Save Changes</button>
          </div>

          <div className="netflix-modal-right">
            <div style={{ marginBottom: '20px' }}>
              <h4 className="netflix-modal-label">MEDIA TYPE</h4>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2F2F2F',
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {movie.type === 'Movie' ? 'MOVIE' : 'TV SERIES'}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 className="netflix-modal-label">RELEASE YEAR</h4>
              <span style={{ color: '#FFFFFF', fontSize: '15px' }}>
                {movie.release_date?.split('-')[0] || movie.release_year || 'N/A'}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 className="netflix-modal-label">GENRES</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {movie.genres.map((genre) => (
                  <span key={genre} className="netflix-modal-genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 className="netflix-modal-label">OVERVIEW</h4>
              <div style={{ color: '#FFFFFF', fontSize: '14px', lineHeight: 1.6 }}>
                {movie.overview || 'No overview available.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
