import { Info, Pencil } from 'lucide-react';
import type { Movie } from '../types/movie';

interface NetflixBillboardProps {
  movie: Movie;
  rating: number;
  onEditLog: () => void;
  onDetails: () => void;
}

const imageBase = 'https://image.tmdb.org/t/p/original';

export default function NetflixBillboard({ movie, rating, onEditLog, onDetails }: NetflixBillboardProps) {
  const backdrop = movie.backdrop_path || movie.poster_path;
  const backdropUrl = backdrop ? `${imageBase}${backdrop}` : undefined;
  const mobileArtwork = movie.poster_path || backdrop;
  const mobileArtworkUrl = mobileArtwork ? `${imageBase}${mobileArtwork}` : undefined;
  const genres = movie.genres.slice(0, 3);

  return (
    <section className="netflix-billboard" aria-label={`Featured title: ${movie.title}`}>
      {backdropUrl && <img className="billboard-image billboard-desktop-image" src={backdropUrl} alt="" aria-hidden="true" />}
      {mobileArtworkUrl && <img className="billboard-image billboard-mobile-image" src={mobileArtworkUrl} alt="" aria-hidden="true" />}
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
        <div className="billboard-actions"><button type="button" onClick={onEditLog} className="billboard-details"><Pencil /> Edit Watch Log</button><button type="button" onClick={onDetails} className="billboard-secondary"><Info /> View Details</button></div>
      </div>
    </section>
  );
}
