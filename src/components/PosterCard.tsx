import { useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Film, Heart, Pencil, Trash2 } from 'lucide-react';
import type { Movie } from '../types/movie';
import type { WatchLogEntry } from '../types/watchLog';
import { getPosterUrl } from '../lib/tmdb';
import ConfirmDialog from './ConfirmDialog';

interface PosterCardProps {
  movie: Movie;
  variant?: 'grid' | 'list';
  onEdit?: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  style?: CSSProperties;
  watchLogEntry?: WatchLogEntry;
  onOpen?: (movie: Movie) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (movieId: string) => void;
  rank?: number;
}

function GenrePills({ genres }: { genres: string[] }) {
  const visible = genres.slice(0, 3);
  const extra = genres.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((genre) => (
        <span key={genre} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-secondary">
          {genre}
        </span>
      ))}
      {extra > 0 && (
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-secondary">+{extra}</span>
      )}
    </div>
  );
}

export default function PosterCard({ movie, variant = 'grid', onEdit, onDelete, style, onOpen, rank, watchLogEntry, isFavorite = false }: PosterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasPosterPath = Boolean(movie.poster_path);
  const imagePath = movie.poster_path || movie.backdrop_path;
  const posterUrl = getPosterUrl(imagePath, variant === 'list' ? (hasPosterPath ? 'w185' : 'w300') : (hasPosterPath ? 'w500' : 'w780'));

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    const frame = event.currentTarget.querySelector<HTMLElement>('.poster-frame');
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    frame.style.setProperty('--mx', `${x * 100}%`);
    frame.style.setProperty('--my', `${y * 100}%`);
    event.currentTarget.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
    event.currentTarget.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
  };

  const resetCardPointer = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  };


  const actions = (onEdit || onDelete) && (
    <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-wl">
      {onEdit && variant === 'list' && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onEdit(movie); }}
          className="rounded-md bg-background/80 p-1.5 text-secondary backdrop-blur hover:text-accent"
          aria-label={`Edit ${movie.title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setConfirmOpen(true); }}
          className="rounded-md bg-background/80 p-1.5 text-secondary backdrop-blur hover:text-danger"
          aria-label={`Delete ${movie.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const poster = posterUrl ? (
    <img
      src={posterUrl}
      alt={`${movie.title} poster`}
      loading="lazy"
      decoding="async"
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageFailed(true)}
      className={`h-full w-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.04] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  ) : (
    <div className="poster-fallback">
      <Film aria-hidden="true" />
      <span>{movie.title}</span>
      <small>{movie.release_year || movie.type}</small>
    </div>
  );
  const posterContent = imageFailed ? (
    <div className="poster-fallback">
      <Film aria-hidden="true" />
      <span>{movie.title}</span>
      <small>{movie.release_year || movie.type}</small>
    </div>
  ) : poster;

  if (variant === 'list') {
    return (
      <>
        <article style={style} className="poster-enter row-glass group relative flex cursor-pointer items-center gap-3 rounded-wl bg-surface p-2.5 pr-14 transition-all duration-300 hover:translate-x-1 hover:bg-surface-2 hover:shadow-md" onClick={() => onOpen?.(movie)}>
          <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {!imageLoaded && posterUrl && !imageFailed && <div className="poster-skeleton absolute inset-0" />}
            {posterContent}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-primary">{movie.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <GenrePills genres={movie.genres} />
            </div>
          </div>
          {actions}
        </article>
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Delete this title?"
          message={`${movie.title} will be removed from your watchlog.`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onDelete?.(movie);
          }}
        />
      </>
    );
  }

  return (
    <>
      <article
        style={style}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetCardPointer}
        className="poster-card group cursor-pointer"
        onClick={() => onOpen?.(movie)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen?.(movie); } }}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? `Log watch for ${movie.title}` : undefined}
      >
        {rank !== undefined && <span className="poster-rank" aria-hidden="true">{rank}</span>}
        <div className="poster-frame relative aspect-[2/3] overflow-hidden rounded-lg bg-surface shadow-md transition-all duration-300 group-hover:scale-[1.05] group-hover:shadow-2xl group-hover:shadow-black">
          {!imageLoaded && posterUrl && !imageFailed && <div className="poster-skeleton absolute inset-0" />}
          {posterContent}
          {isFavorite && <span className="poster-favorite-badge active" aria-label="Favorite"><Heart aria-hidden="true" /></span>}
          {watchLogEntry?.rewatch && <span className="poster-rewatch-badge">↻ Rewatched</span>}
          {movie.type === 'TV Series' && Boolean(watchLogEntry?.watchedSeasons.length) && <span className="poster-seasons-badge">✓ {watchLogEntry?.watchedSeasons.length} seasons watched</span>}
          <div className="poster-hover-info" aria-hidden="true">
            <h3>{movie.title}</h3>
            <div><span>{watchLogEntry?.watchedDate || movie.release_year || movie.release_date?.slice(0, 4) || ''}</span><span>Edit Log →</span></div>
          </div>
        </div>
      </article>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete this title?"
        message={`${movie.title} will move to Recently Deleted, where you can restore it from the Logbook.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete?.(movie);
        }}
      />
    </>
  );
}
