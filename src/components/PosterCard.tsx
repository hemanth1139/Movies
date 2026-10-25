import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Check, ChevronDown, Film, Heart, Pencil, Star, Trash2 } from 'lucide-react';
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

export default function PosterCard({ movie, variant = 'grid', onEdit, onDelete, style, watchLogEntry, onOpen, isFavorite = false, onFavoriteToggle, rank }: PosterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const posterUrl = getPosterUrl(movie.poster_path, variant === 'list' ? 'w185' : 'w500');

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

  const startHoverTimer = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverExpanded(true), 300);
  };
  const cancelHoverTimer = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHoverExpanded(false);
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
      className={`h-full w-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.04] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-surface-2">
      <Film className="h-10 w-10 text-secondary/40" aria-hidden="true" />
    </div>
  );

  if (variant === 'list') {
    return (
      <>
        <article style={style} className="poster-enter row-glass group relative flex cursor-pointer items-center gap-3 rounded-wl bg-surface p-2.5 pr-14 transition-all duration-300 hover:translate-x-1 hover:bg-surface-2 hover:shadow-md" onClick={() => onOpen?.(movie)}>
          <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {!imageLoaded && posterUrl && <div className="poster-skeleton absolute inset-0" />}
            {poster}
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
        className={`poster-card group cursor-pointer ${hoverExpanded ? 'is-expanded' : ''}`}
        onClick={() => onOpen?.(movie)}
        onMouseEnter={startHoverTimer}
        onMouseLeave={cancelHoverTimer}
        onFocusCapture={() => setHoverExpanded(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoverExpanded(false); }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen?.(movie); } }}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? `Log watch for ${movie.title}` : undefined}
      >
        {rank !== undefined && <span className="poster-rank" aria-hidden="true">{rank}</span>}
        <div className="poster-frame relative z-[2] aspect-[2/3] overflow-hidden rounded-wl-md bg-surface">
          {!imageLoaded && posterUrl && <div className="poster-skeleton absolute inset-0" />}
          {poster}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-background/95 via-background/5 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
          {watchLogEntry?.rating ? <span className="rating-badge absolute right-2.5 top-2.5 z-[3]"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {watchLogEntry.rating.toFixed(1)}</span> : null}
          {actions}
        </div>
        <div className="poster-card-caption">
          <h3>{movie.title}</h3>
          <span>{movie.release_year ?? 'Year unknown'} <i>&bull;</i> {movie.type === 'Movie' ? 'Movie' : 'Series'}</span>
        </div>
        <div className="netflix-mini-modal" aria-hidden={!hoverExpanded}>
          <div className="netflix-mini-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="mini-action watched-action" aria-label="Watched"><Check /></button>
            <button type="button" className={`mini-action ${isFavorite ? 'favorite-action active' : ''}`} aria-label={isFavorite ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`} aria-pressed={isFavorite} onClick={() => onFavoriteToggle?.(movie.id)}><Heart /></button>
            {onEdit && <button type="button" className="mini-action" aria-label={`Edit ${movie.title}`} onClick={() => onEdit(movie)}><Pencil /></button>}
            <button type="button" className="mini-action more-action" aria-label={`View details for ${movie.title}`} onClick={() => onOpen?.(movie)}><ChevronDown /></button>
          </div>
          <div className="mini-meta-line">
            {watchLogEntry?.rating ? <span className="mini-rating"><Star /> {watchLogEntry.rating.toFixed(1)}/5</span> : <span className="mini-unrated">Not rated</span>}
            {movie.release_year && <span>{movie.release_year}</span>}
            <span className="mini-type-badge">{movie.type === 'Movie' ? 'MOVIE' : 'SERIES'}</span>
          </div>
          {movie.type === 'TV Series' && watchLogEntry && watchLogEntry.totalSeasons > 0 && <p className="mini-season-progress">{watchLogEntry.watchedSeasons.length} of {watchLogEntry.totalSeasons} seasons watched</p>}
          <p className="netflix-card-genres">{movie.genres.slice(0, 3).join('  •  ')}</p>
          <h3>{movie.title}</h3>
        </div>
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
