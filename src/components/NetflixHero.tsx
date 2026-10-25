import type { Movie } from '../types/movie';
import { Play, Info } from 'lucide-react';

interface NetflixHeroProps {
  movie: Movie;
  onEdit: () => void;
}

export default function NetflixHero({ movie, onEdit }: NetflixHeroProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    <div
      className="netflix-hero"
      style={{ backgroundImage: `url(${backdropUrl})` }}
    >
      <div className="netflix-hero-vignette" />
      <div className="netflix-hero-radial" />

      <div className="netflix-hero-content">
        <span className="netflix-hero-badge">
          {movie.type === 'TV Series' ? 'Recently Watched Series' : 'Recently Watched Movie'}
        </span>

        <h2 className="netflix-hero-title">{movie.title}</h2>

        <div className="netflix-hero-rating">
          <span>{renderStars(4.5)}</span>
          <span>•</span>
          <span>Watched on {formatDate(movie.created_at)}</span>
        </div>

        <p className="netflix-hero-review">
          {movie.overview || 'A captivating story that keeps you engaged from start to finish.'}
        </p>

        <div className="netflix-hero-buttons">
          <button onClick={onEdit} className="netflix-primary-button">
            <Play size={20} />
            Edit Log
          </button>

          <button className="netflix-secondary-button">
            <Info size={20} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
