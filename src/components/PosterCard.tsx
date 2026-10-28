import { memo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Film, Pencil, Star, Trash2 } from 'lucide-react';
import type { Movie } from '../types/movie';
import type { WatchLogEntry } from '../types/watchLog';
import { getPosterUrl } from '../lib/tmdb';
import ConfirmDialog from './ConfirmDialog';

// Check if device is touch-enabled
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

interface PosterCardProps {
  movie: Movie;
  variant?: 'grid' | 'list';
  onEdit?: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  style?: CSSProperties;
  watchLogEntry?: WatchLogEntry;
  onOpen?: (movie: Movie) => void;
  rank?: number;
}

const GenrePills = memo(function GenrePills({ genres }: { genres: string[] }) {
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
});

const PosterCard = function PosterCard({
  movie,
  variant = 'grid',
  onEdit,
  onDelete,
  style,
  onOpen,
  rank,
  watchLogEntry,
}: PosterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasPosterPath = Boolean(movie.poster_path);
  const imagePath = movie.poster_path || movie.backdrop_path;

  // Optimize image sizes based on variant
  const imageSize = variant === 'list'
    ? (hasPosterPath ? 'w185' : 'w300')
    : (hasPosterPath ? 'w500' : 'w780');

  const posterUrl = getPosterUrl(imagePath, imageSize);

  // Generate srcset for responsive images
  const srcSet = imagePath ? [
    getPosterUrl(imagePath, 'w92'),
    getPosterUrl(imagePath, 'w154'),
    getPosterUrl(imagePath, 'w185'),
    getPosterUrl(imagePath, 'w342'),
    getPosterUrl(imagePath, 'w500'),
    getPosterUrl(imagePath, 'w780'),
  ].map((url, i) => `${url} ${[92, 154, 185, 342, 500, 780][i]}w`).join(', ') : undefined;

  // Responsive sizes attribute
  const sizes = variant === 'list'
    ? '(max-width: 680px) 44px, 185px'
    : '(max-width: 480px) 50vw, (max-width: 680px) 33vw, (max-width: 900px) 25vw, (max-width: 1200px) 20vw, 16vw';

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    // Disable 3D tilt effect on touch devices for better performance
    if (event.pointerType !== 'mouse' || isTouchDevice()) return;
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
    <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-wl">
      {onEdit && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onEdit(movie); }}
          className="rounded-md bg-black/70 p-1.5 text-gray-300 backdrop-blur hover:text-white hover:bg-black/90 transition-colors"
          aria-label={`Edit ${movie.title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setConfirmOpen(true); }}
          className="rounded-md bg-black/70 p-1.5 text-gray-300 backdrop-blur hover:text-red-400 hover:bg-black/90 transition-colors"
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
      srcSet={srcSet}
      sizes={sizes}
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
    const rating = watchLogEntry?.rating ?? 0;
    return (
      <>
        <article
          style={style}
          className="poster-enter row-glass group relative flex cursor-pointer items-center gap-3 rounded-wl bg-surface p-2.5 pr-20 transition-all duration-300 hover:translate-x-1 hover:bg-surface-2 hover:shadow-md"
          onClick={() => onOpen?.(movie)}
        >
          <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {!imageLoaded && posterUrl && !imageFailed && <div className="poster-skeleton absolute inset-0" />}
            {posterContent}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-primary">{movie.title}</h3>
              {movie.release_year && <span className="text-xs text-gray-400 font-mono">({movie.release_year})</span>}
              {rating > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs text-amber-400 font-semibold ml-1">
                  <Star className="h-3 w-3 fill-amber-400" /> {rating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <GenrePills genres={movie.genres} />
            </div>
          </div>
          {actions}
        </article>
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Delete this title?"
          message={`${movie.title} will be removed from your collection.`}
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

          {actions}

          {watchLogEntry?.rewatch && (
            <div className="poster-badge-stack">
              <span className="poster-rewatch-badge">↻ Rewatched</span>
            </div>
          )}

          <div className="poster-hover-info">
            <h3>{movie.title}</h3>
            <div>
              <span>{watchLogEntry?.watchedDate || movie.release_year || movie.release_date?.slice(0, 4) || ''}</span>
              <span>Edit Log →</span>
            </div>
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
};

export default memo(PosterCard);
