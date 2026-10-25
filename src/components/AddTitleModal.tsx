import { useEffect, useState } from 'react';
import { X, Search, Loader2, Film } from 'lucide-react';
import type { TMDBSearchResult, TMDBMovieDetails, Movie, MediaType } from '../types/movie';
import { searchTMDBDetailed, getMovieDetails, getReleaseYear, getPosterUrl, tmdbErrorMessage } from '../lib/tmdb';
import { getMovieByTmdbId, createMovie } from '../lib/database';
import { GENRES, mapTmdbGenreIds, mapTmdbGenreNames, uniqueGenres } from '../lib/genres';

interface AddTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTitleAdded: (movie: Movie) => void;
}

const getUniverseSuggestion = (details: TMDBMovieDetails | null): string => {
  const collection = details?.belongs_to_collection?.name.toLowerCase() ?? '';
  const companies = (details?.production_companies ?? []).map((company) => company.name.toLowerCase());
  if (companies.some((company) => company.includes('marvel studios')) || collection.includes('marvel cinematic universe')) return 'Marvel Cinematic Universe';
  if (companies.some((company) => company.includes('dc studios') || company.includes('dc films') || company.includes('dc entertainment')) || collection.includes('dc universe')) return 'DC Universe';
  if (collection.includes('conjuring') || collection.includes('annabelle') || collection.includes('the nun')) return 'The Conjuring Universe';
  if (companies.some((company) => company.includes('pixar') || company.includes('walt disney') || company.includes('disneytoon'))) return 'Disney & Pixar';
  return '';
};

export default function AddTitleModal({ isOpen, onClose, onTitleAdded }: AddTitleModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<TMDBSearchResult | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<TMDBMovieDetails | null>(null);
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType>('Movie');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setSelectedDetails(null);
    setTitle('');
    setSelectedType('Movie');
    setSelectedGenres([]);
    setSelectedUniverse('');
    setIsSearching(false);
    setIsAdding(false);
    setTmdbError(null);
    setFormError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Enter' && selectedResult && !event.shiftKey) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'BUTTON') return;
        event.preventDefault();
        void handleAddTitle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, selectedResult, title, selectedType, selectedGenres, isAdding]);

  useEffect(() => {
    if (!isOpen || selectedResult) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setTmdbError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      const { results, error } = await searchTMDBDetailed(query, undefined, undefined, controller.signal);
      if (cancelled) return;
      setSearchResults(results.filter((result) => result.media_type !== 'person'));
      setTmdbError(tmdbErrorMessage(error));
      setIsSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, isOpen, selectedResult]);

  const handleSelectResult = async (result: TMDBSearchResult) => {
    const mediaType: MediaType = result.media_type === 'tv' ? 'TV Series' : 'Movie';
    setSelectedResult(result);
    setSelectedDetails(null);
    setTitle(result.title || result.name || '');
    setSelectedType(mediaType);
    setSelectedGenres(mapTmdbGenreIds(result.genre_ids));
    setSelectedUniverse('');
    setFormError(null);

    const type = result.media_type === 'tv' ? 'tv' : 'movie';
    const details = await getMovieDetails(result.id, type);
    setSelectedDetails(details);
    setSelectedUniverse(getUniverseSuggestion(details));
    if (details?.genres?.length) {
      setSelectedGenres(mapTmdbGenreNames(details.genres));
    }
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddTitle = async () => {
    if (!selectedResult || isAdding) return;
    if (!title.trim()) {
      setFormError('Add a name for this title.');
      return;
    }
    if (selectedGenres.length === 0) {
      setFormError('Pick at least one genre.');
      return;
    }

    setIsAdding(true);
    setFormError(null);

    const existing = await getMovieByTmdbId(selectedResult.id);
    if (existing) {
      setFormError('This title is already in your collection.');
      setIsAdding(false);
      return;
    }

    const movie: Omit<Movie, 'id' | 'created_at' | 'updated_at'> = {
      title: title.trim(),
      type: selectedType,
      genres: selectedGenres,
      franchise: selectedUniverse || null,
      release_year: getReleaseYear(selectedResult.release_date || selectedResult.first_air_date),
      tmdb_id: selectedResult.id,
      poster_path: selectedResult.poster_path,
      backdrop_path: selectedResult.backdrop_path ?? selectedDetails?.backdrop_path,
      overview: selectedResult.overview ?? selectedDetails?.overview,
      original_language: selectedResult.original_language ?? selectedDetails?.original_language,
      origin_country: selectedResult.origin_country ?? selectedDetails?.origin_country,
    };

    const created = await createMovie(movie);
    if (created) {
      onTitleAdded({ ...created, ...movie });
      onClose();
    } else {
      setFormError('Could not save this title. Check your connection and try again.');
    }

    setIsAdding(false);
  };

  if (!isOpen) return null;

  const genreOptions = uniqueGenres([...GENRES, ...selectedGenres]);

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title-heading"
        className="glass-modal flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-wl bg-surface border border-border sm:rounded-wl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="add-title-heading" className="text-lg font-semibold text-primary">
            Add title
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
          {!selectedResult ? (
            <div>
              <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search TMDB by title..."
                    aria-label="Title to search on TMDB"
                    className="w-full rounded-wl-sm border border-transparent bg-background py-3 pl-10 pr-10 text-sm text-primary placeholder:text-secondary/60"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" />
                  )}
              </div>

              {tmdbError && (
                <p className="mb-4 rounded-wl-sm bg-background px-3 py-2 text-sm text-danger">{tmdbError}</p>
              )}

              <div className="grid gap-2">
                {searchResults.map((result) => {
                  const name = result.title || result.name || 'Untitled';
                  const posterUrl = getPosterUrl(result.poster_path, 'w185');
                  return (
                    <button
                      key={`${result.media_type}-${result.id}`}
                      type="button"
                      onClick={() => void handleSelectResult(result)}
                      className="flex items-center gap-3 rounded-wl-sm bg-background p-2.5 text-left hover:bg-surface-2 transition-colors duration-wl"
                    >
                      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
                        {posterUrl ? (
                          <img src={posterUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film className="h-5 w-5 text-secondary/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-primary">{name}</p>
                        <p className="mt-1 text-xs text-secondary">
                          {result.media_type === 'tv' ? 'Series' : 'Movie'}
                          {getReleaseYear(result.release_date || result.first_air_date)
                            ? ` · ${getReleaseYear(result.release_date || result.first_air_date)}`
                            : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && !tmdbError && (
                <p className="py-10 text-center text-sm text-secondary">No TMDB results for that search.</p>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="mb-4 text-sm text-accent hover:opacity-80"
              >
                ← Back to search
              </button>

              <div className="mb-5 flex gap-4">
                <div className="h-36 w-24 shrink-0 overflow-hidden rounded-wl-sm bg-background">
                  {selectedResult.poster_path ? (
                    <img
                      src={getPosterUrl(selectedResult.poster_path)}
                      alt={`${title} poster`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="h-8 w-8 text-secondary/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">TMDB match</p>
                    <p className="mt-1 text-xs text-secondary">{selectedType === 'TV Series' ? 'Series' : 'Movie'}{getReleaseYear(selectedResult.release_date || selectedResult.first_air_date) ? ` • ${getReleaseYear(selectedResult.release_date || selectedResult.first_air_date)}` : ''}</p>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-primary">Name</span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full rounded-wl-sm bg-background px-3 py-2 text-sm text-primary"
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
                          onClick={() => setSelectedType(option.value)}
                          className={`choice-tab rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-wl ${
                            selectedType === option.value
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

              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-medium text-primary">Universe / franchise</span>
                <select value={selectedUniverse} onChange={(event) => setSelectedUniverse(event.target.value)} className="w-full rounded-wl-sm border border-border bg-background px-3 py-2 text-sm text-primary">
                  <option value="">Standalone / none</option>
                  <option value="Marvel Cinematic Universe">Marvel Cinematic Universe (MCU)</option>
                  <option value="The Conjuring Universe">The Conjuring Universe</option>
                  <option value="DC Universe">DC Universe</option>
                  <option value="Disney & Pixar">Disney & Pixar</option>
                </select>
                <span className="mt-1 block text-xs text-secondary">TMDB studio and collection details suggest a universe when available; you can change it here.</span>
              </label>

              {(selectedDetails?.overview || selectedResult.overview) && <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-secondary">{selectedDetails?.overview || selectedResult.overview}</p>}

              <div>
                <span className="mb-2 block text-sm font-medium text-primary">Genres</span>
                <div className="flex flex-wrap gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={`genre-choice rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-wl ${
                        selectedGenres.includes(genre)
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

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-wl-sm px-3 py-2 text-sm text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddTitle()}
                  disabled={isAdding}
                  className="inline-flex items-center gap-2 rounded-wl-sm bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:opacity-90 disabled:opacity-50"
                >
                  {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
