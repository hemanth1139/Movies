import { Info } from 'lucide-react';
import type { Movie } from '../types/movie';

interface NetflixBillboardProps {
  movie: Movie;
  rating: number;
  onDetails: () => void;
}

const imageBase = 'https://image.tmdb.org/t/p/original';

export default function NetflixBillboard({ movie, rating, onDetails }: NetflixBillboardProps) {
  const backdrop = movie.backdrop_path || movie.poster_path;
  const genres = movie.genres.slice(0, 3);

  return (
    <section className="netflix-billboard" style={backdrop ? { backgroundImage: `url("${imageBase}${backdrop}")` } : undefined} aria-label={`Featured title: ${movie.title}`}>
      <div className="billboard-shade" aria-hidden="true" />
      <div className="billboard-content">
        <p className="billboard-kicker"><span className="billboard-mark" /> From your watchlog</p>
        <h2>{movie.title}</h2>
        <div className="billboard-meta">
          {movie.release_year && <span>{movie.release_year}</span>}
          <span className="billboard-type">{movie.type === 'Movie' ? 'MOVIE' : 'SERIES'}</span>
          {rating > 0 && <span className="billboard-rating">★ {rating.toFixed(1)} / 5</span>}
          {genres.map((genre) => <span key={genre}>{genre}</span>)}
        </div>
        <p className="billboard-overview">{movie.overview || 'A story from your collection, ready to revisit.'}</p>
        <button type="button" onClick={onDetails} className="billboard-details"><Info /> View details</button>
      </div>
      <div className="billboard-edge-fade" aria-hidden="true" />
    </section>
  );
}
