import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Film } from 'lucide-react';
import type { Movie, MediaType } from '../types/movie';
import { getPosterUrl } from '../lib/tmdb';
import { updateMovie } from '../lib/database';
import { GENRES, uniqueGenres } from '../lib/genres';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  onMovieUpdated: (movie: Movie) => void;
}

export default function EditModal({ isOpen, onClose, movie, onMovieUpdated }: EditModalProps) {
  const [title, setTitle] = useState(movie.title);
  const [type, setType] = useState<MediaType>(movie.type);
  const [genres, setGenres] = useState<string[]>(movie.genres);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const latestMovie = useRef(movie);

  useEffect(() => { latestMovie.current = movie; }, [movie]);

  useEffect(() => {
    if (!isOpen) return;
    const currentMovie = latestMovie.current;
    setTitle(currentMovie.title);
    setType(currentMovie.type);
    setGenres(currentMovie.genres);
    setFormError(null);
    setIsSaving(false);
  }, [isOpen, movie.id]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleGenreToggle = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!title.trim()) {
      setFormError('Add a name for this title.');
      return;
    }
    if (genres.length === 0) {
      setFormError('Pick at least one genre.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const updated = await updateMovie(movie.id, { title: title.trim(), type, genres });
      if (!updated) {
        setFormError('Could not save changes. Check your connection and try again.');
        return;
      }
      onMovieUpdated(updated);
      onClose();
    } catch {
      setFormError('Could not save changes. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, title, genres, movie.id, type, onMovieUpdated, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Enter') {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'BUTTON') return;
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  const posterUrl = getPosterUrl(movie.poster_path);
  const genreOptions = uniqueGenres([...GENRES, ...genres]);

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title-heading"
        className="glass-modal flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-wl bg-surface border border-border sm:rounded-wl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="edit-title-heading" className="text-lg font-semibold text-primary">
            Edit title
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-wl-sm p-2 text-secondary hover:bg-surface-2 hover:text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-5 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="h-36 w-24 shrink-0 overflow-hidden rounded-wl-sm bg-background">
              {posterUrl ? (
                <img src={posterUrl} alt={`${title} poster`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Film className="h-8 w-8 text-secondary/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-primary">Name</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-wl-sm bg-background px-3 py-2 text-sm text-primary"
                  autoFocus
                />
              </label>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-primary">Type</span>
                <div className="flex gap-2">
                  {([
                    { value: 'Movie', label: 'Movie' },
                    { value: 'TV Series', label: 'Series' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`choice-tab rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-wl ${
                        type === option.value
                          ? 'choice-tab-active text-white'
                          : 'bg-background text-secondary hover:text-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-primary">Genres</span>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleGenreToggle(genre)}
                  className={`genre-choice rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-wl ${
                    genres.includes(genre)
                      ? 'border-white/20 bg-surface-2 text-primary'
                      : 'border-border bg-surface text-secondary hover:border-accent/50 hover:text-accent'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="mt-4 text-sm text-danger">{formError}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-wl-sm px-4 py-2 text-sm text-secondary hover:text-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-wl-sm bg-accent px-5 py-2 text-sm font-medium text-accent-text hover:opacity-90 disabled:opacity-50 min-h-[44px]"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
