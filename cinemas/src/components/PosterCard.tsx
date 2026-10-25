import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Film, Pencil, Trash2 } from 'lucide-react';
import type { Movie } from '../types/movie';
import { getPosterUrl } from '../lib/tmdb';
import ConfirmDialog from './ConfirmDialog';

interface PosterCardProps {
  movie: Movie;
  variant?: 'grid' | 'list';
  onEdit?: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  style?: CSSProperties;
}

function TypeBadge({ type }: { type: Movie['type'] }) {
  return (
    <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
      {type === 'TV Series' ? 'Series' : 'Movie'}
    </span>
  );
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

export default function PosterCard({ movie, variant = 'grid', onEdit, onDelete, style }: PosterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const posterUrl = getPosterUrl(movie.poster_path, variant === 'list' ? 'w185' : 'w500');

  const actions = (onEdit || onDelete) && (
    <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-wl">
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(movie)}
          className="rounded-md bg-background/80 p-1.5 text-secondary backdrop-blur hover:text-accent"
          aria-label={`Edit ${movie.title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
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
        <article style={style} className="poster-enter group relative flex items-center gap-3 rounded-wl bg-surface p-2.5 pr-14 transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-md">
          <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {!imageLoaded && posterUrl && <div className="poster-skeleton absolute inset-0" />}
            {poster}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-primary">{movie.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <TypeBadge type={movie.type} />
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
      <article style={style} className="poster-enter group">
        <div className="relative mb-2.5 aspect-[2/3] overflow-hidden rounded-wl bg-surface shadow-sm transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-slate-900/15">
          {!imageLoaded && posterUrl && <div className="poster-skeleton absolute inset-0" />}
          {poster}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-wl md:group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden p-3 opacity-0 transition-opacity duration-wl md:block md:group-hover:opacity-100">
            <GenrePills genres={movie.genres} />
          </div>
          {actions}
        </div>
        <h3 className="truncate text-sm font-medium text-primary group-hover:text-accent transition-colors duration-wl">
          {movie.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <TypeBadge type={movie.type} />
          <div className="md:hidden">
            <GenrePills genres={movie.genres} />
          </div>
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
