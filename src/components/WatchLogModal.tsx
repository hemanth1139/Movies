import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Clapperboard, Film, Plus, Star, Tv, X, RefreshCw } from 'lucide-react';
import type { Movie } from '../types/movie';
import { emptyWatchLogEntry, type WatchLogEntry } from '../types/watchLog';
import { getPosterUrl, getVerifiedMovieDetails } from '../lib/tmdb';

interface WatchLogModalProps {
  isOpen: boolean;
  movies: Movie[];
  initialMovie?: Movie | null;
  watchLog: Record<string, WatchLogEntry>;
  onClose: () => void;
  onSave: (movieId: string, entry: WatchLogEntry) => void;
  onAddTitle: () => void;
  onRemove?: (movieId: string) => void;
}

export default function WatchLogModal({ isOpen, movies, initialMovie, watchLog, onClose, onSave, onAddTitle, onRemove }: WatchLogModalProps) {
  const [movieId, setMovieId] = useState(initialMovie?.id ?? '');
  const [rating, setRating] = useState(0);
  const [rewatch, setRewatch] = useState(false);
  const [review, setReview] = useState('');
  const [watchedDate, setWatchedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [universe, setUniverse] = useState('');
  const [isCustomUniverse, setIsCustomUniverse] = useState(false);
  const [universeOrder, setUniverseOrder] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [totalSeasons, setTotalSeasons] = useState(0);
  const [watchedSeasons, setWatchedSeasons] = useState<number[]>([]);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [detailsOverview, setDetailsOverview] = useState('');
  const [detailsBackdrop, setDetailsBackdrop] = useState('');
  const [seasonDetails, setSeasonDetails] = useState<Array<{ season_number: number; episode_count: number }>>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const movie = useMemo(() => initialMovie ?? movies.find((item) => item.id === movieId) ?? null, [initialMovie, movies, movieId]);
  const poster = movie ? getPosterUrl(movie.poster_path, 'w500') : undefined;
  const backdropPath = movie?.backdrop_path || detailsBackdrop;
  const backdrop = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : undefined;
  const overview = movie?.overview || detailsOverview;
  const universeOptions = useMemo(() => [...new Set(movies.map((item) => watchLog[item.id]?.universe || item.universe || item.franchise).filter((value): value is string => Boolean(value)))].sort(), [movies, watchLog]);
  const latestFormInputs = useRef({ movies, initialMovie, watchLog, universeOptions });
  useEffect(() => {
    latestFormInputs.current = { movies, initialMovie, watchLog, universeOptions };
  }, [movies, initialMovie, watchLog, universeOptions]);

  const resetForMovie = (nextId: string) => {
    const latest = latestFormInputs.current;
    const selectedMovie = latest.initialMovie?.id === nextId ? latest.initialMovie : latest.movies.find((item) => item.id === nextId);
    const entry = nextId ? latest.watchLog[nextId] : undefined;
    const data = entry ?? emptyWatchLogEntry();
    setMovieId(nextId);
    setRating(data.rating);
    setRewatch(data.rewatch);
    setReview(data.review);
    setWatchedDate(data.watchedDate || new Date().toISOString().slice(0, 10));
    setTotalSeasons(data.totalSeasons || selectedMovie?.total_seasons || 0);
    setWatchedSeasons(data.watchedSeasons ?? []);
    setUniverse(data.universe || selectedMovie?.universe || selectedMovie?.franchise || '');
    setUniverseOrder(data.universeOrder ? String(data.universeOrder) : '');
    setIsCustomUniverse(Boolean(data.universe && !latest.universeOptions.includes(data.universe)));
  };

  useEffect(() => {
    if (!isOpen) return;
    const targetId = initialMovie?.id;
    if (targetId) {
      resetForMovie(targetId);
    }
  }, [isOpen, initialMovie?.id]);

  useEffect(() => {
    if (!isOpen || !movie) return;
    let cancelled = false;
    setRuntime(movie.type === 'Movie' ? movie.runtime ?? null : null);
    setDetailsOverview(movie.overview ?? '');
    setDetailsBackdrop(movie.backdrop_path ?? '');
    setSeasonDetails([]);

    getVerifiedMovieDetails(movie).then((details) => {
      if (cancelled) return;
      setDetailsOverview(details?.overview ?? movie.overview ?? '');
      setDetailsBackdrop(details?.backdrop_path ?? movie.backdrop_path ?? '');
      if (movie.type === 'Movie') {
        setRuntime(details?.runtime ?? movie.runtime ?? null);
      } else {
        const seasons = (details?.seasons ?? [])
          .filter((season) => season.season_number > 0)
          .sort((a, b) => a.season_number - b.season_number)
          .map(({ season_number, episode_count }) => ({ season_number, episode_count }));
        setSeasonDetails(seasons);
        const seasonCount = seasons.length || details?.number_of_seasons || movie.total_seasons || 0;
        setTotalSeasons(seasonCount);
        setWatchedSeasons((current) => current.filter((season) => season <= seasonCount));
      }
    }).finally(() => {
      if (!cancelled) setIsMetadataLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, movie]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ') || '< 1m';
  };

  const isSeries = movie?.type === 'TV Series' || (movie?.type as string) === 'Series' || (movie?.type as string)?.toLowerCase().includes('series');

  const seasonNumbers = useMemo(() => {
    if (!isSeries) return [];
    if (seasonDetails.length > 0) {
      return seasonDetails.map((s) => s.season_number);
    }
    const count = totalSeasons || movie?.total_seasons || 0;
    if (count > 0) {
      return Array.from({ length: count }, (_, i) => i + 1);
    }
    return [1];
  }, [isSeries, seasonDetails, totalSeasons, movie?.total_seasons]);

  if (!isOpen) return null;

  const allSeasonsSelected = seasonNumbers.length > 0 && seasonNumbers.every((s) => watchedSeasons.includes(s));

  const toggleAllSeasons = () => {
    if (allSeasonsSelected) {
      setWatchedSeasons([]);
    } else {
      setWatchedSeasons(seasonNumbers);
    }
  };

  const toggleSeason = (seasonNum: number) => {
    setWatchedSeasons((prev) =>
      prev.includes(seasonNum)
        ? prev.filter((s) => s !== seasonNum)
        : [...prev, seasonNum].sort((a, b) => a - b)
    );
  };

  const submit = () => {
    if (!movie) return;
    const finalTotalSeasons = isSeries ? (seasonNumbers.length || totalSeasons) : totalSeasons;
    onSave(movie.id, { rating, watchedDate, rewatch, review, watchedEpisodes: [], totalSeasons: finalTotalSeasons, watchedSeasons, universe: universe.trim(), universeOrder: universeOrder ? Number(universeOrder) : undefined });
    onClose();
  };

  return (
    <div className="watch-modal-backdrop fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5" onClick={onClose}>
      <section className="watch-modal relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="watch-modal-title" onClick={(event) => event.stopPropagation()}>
        {backdrop && <div className="watch-modal-backdrop-art" style={{ backgroundImage: `url("${backdrop}")` }} aria-hidden="true" />}
        <div className="watch-modal-scrim" aria-hidden="true" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#161616] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Clapperboard className="h-4 w-4 text-[#E50914]" /> Log a watch</div>
            <button type="button" onClick={onClose} className="icon-button" aria-label="Close watch log"><X className="h-4 w-4" /></button>
          </header>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 sm:p-7 md:grid-cols-[220px_1fr]">
            <aside className="hidden md:block">
              {poster ? <img src={poster} alt={`${movie?.title ?? 'Selected title'} poster`} className="watch-poster" /> : (
                <div className="watch-poster poster-placeholder"><Film className="h-10 w-10" /></div>
              )}
            </aside>

            <div className="min-w-0">
              {movie ? (
                <div className="selected-media flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[#E50914]">{movie?.type === 'TV Series' ? <Tv /> : <Film />}</span>
                  <div className="min-w-0"><h2 id="watch-modal-title" className="truncate text-xl font-semibold text-white">{movie?.title}</h2><p className="text-xs text-gray-400">{movie?.release_year ?? movie?.release_date?.slice(0, 4) ?? 'Year unknown'}{movie.type === 'Movie' ? ` • Runtime: ${runtime ? formatRuntime(runtime) : isMetadataLoading ? 'Loading…' : 'Unavailable'}` : ` • ${totalSeasons || '—'} ${totalSeasons === 1 ? 'Season' : 'Seasons'} • ${seasonDetails.reduce((sum, season) => sum + season.episode_count, 0) || '—'} Episodes`}</p></div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select id="watch-title-select" value={movieId} onChange={(event) => resetForMovie(event.target.value)} className="watch-input min-w-0 flex-1">
                    <option value="">Choose a title from your library</option>
                    {movies.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.type}</option>)}
                  </select>
                  <button type="button" onClick={onAddTitle} className="secondary-button shrink-0"><Plus className="h-4 w-4" /> Add title</button>
                </div>
              )}

              {movie && <>
                <div className="mt-4">
                  <span className="field-label">Category</span>
                  <div className="flex flex-wrap gap-2">{movie.genres.length ? movie.genres.map((genre) => <span className="meta-pill" key={genre}>{genre}</span>) : <span className="text-xs text-gray-500">No category listed</span>}</div>
                </div>
                <div className="universe-form mt-4">
                  <label><span className="field-label">Universe / Collection</span><select className="watch-input" value={isCustomUniverse ? '__custom__' : universe} onChange={(event) => { const next = event.target.value; setIsCustomUniverse(next === '__custom__'); setUniverse(next === '__custom__' ? '' : next); }}><option value="">Standalone</option>{universeOptions.map((option) => <option key={option} value={option}>{option}</option>)}<option value="__custom__">+ Add new universe…</option></select></label>
                  {isCustomUniverse && <label><span className="field-label">New universe name</span><input className="watch-input" value={universe} onChange={(event) => setUniverse(event.target.value)} placeholder="e.g. Marvel Cinematic Universe" /></label>}
                  {universe && <label><span className="field-label">Timeline order (optional)</span><input className="watch-input" type="number" min="1" value={universeOrder} onChange={(event) => setUniverseOrder(event.target.value)} placeholder="Chronological order" /></label>}
                </div>
                {overview && <p className="watch-overview">{overview}</p>}
                <div className="watch-form-grid mt-6">
                  <div className="form-block">
                    <span className="field-label">Your rating</span>
                    <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="Rating">
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        const previewRating = hoveredRating || rating;
                        return (
                          <button
                            key={value}
                            type="button"
                            onPointerEnter={() => setHoveredRating(value)}
                            onPointerLeave={() => setHoveredRating(0)}
                            onClick={(event) => {
                              const rect = event.currentTarget.getBoundingClientRect();
                              const isLeftHalf = (event.clientX - rect.left) < (rect.width / 2);
                              const targetVal = isLeftHalf ? value - 0.5 : value;
                              setRating(rating === targetVal ? 0 : targetVal);
                            }}
                            className="rating-star min-h-[44px] min-w-[36px] flex items-center justify-center p-1.5"
                            aria-label={`Rate ${value} stars (tap left half for ${value - 0.5})`}
                            aria-checked={rating >= value - 0.5}
                            role="radio"
                          >
                            <Star className={`h-6 w-6 ${previewRating >= value ? 'fill-amber-400 text-amber-400' : previewRating >= value - 0.5 ? 'fill-amber-400/50 text-amber-400' : 'text-gray-600'}`} />
                          </button>
                        );
                      })}
                      <span className="ml-2 font-mono text-sm font-semibold text-amber-400">{rating ? `${rating.toFixed(1)} / 5` : 'Not rated'}</span>
                    </div>
                  </div>
                  <label className="form-block"><span className="field-label">Watched date</span><span className="date-field"><CalendarDays className="h-4 w-4 text-gray-500" /><input type="date" value={watchedDate} onChange={(event) => setWatchedDate(event.target.value)} className="watch-input" /></span></label>
                  <div className="form-block"><span className="field-label">Quick Toggles</span><div className="quick-toggles"><button type="button" aria-pressed={rewatch} className={rewatch ? 'quick-toggle active' : 'quick-toggle'} onClick={() => setRewatch(!rewatch)}><RefreshCw /> Rewatch</button></div></div>
                </div>
                {isSeries && seasonNumbers.length > 0 && (
                  <div className="seasons-watched-section mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="field-label !mb-0 text-xs text-gray-400">
                        Seasons Watched ({watchedSeasons.filter((s) => seasonNumbers.includes(s)).length} of {seasonNumbers.length} selected)
                      </span>
                      <button
                        type="button"
                        onClick={toggleAllSeasons}
                        className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
                      >
                        {allSeasonsSelected ? 'Deselect All' : 'Select All Seasons'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {seasonNumbers.map((seasonNum) => {
                        const isSelected = watchedSeasons.includes(seasonNum);
                        return (
                          <button
                            key={seasonNum}
                            type="button"
                            onClick={() => toggleSeason(seasonNum)}
                            className={`season-pill ${isSelected ? 'active' : ''}`}
                            aria-pressed={isSelected}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                            <span>S{seasonNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <label className="form-block review-block"><span className="field-label">Personal Review / Notes</span><textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Add your personal thoughts or review notes..." /></label>
              </>}

            </div>
          </div>
          <footer className="watch-modal-actions flex shrink-0 justify-between gap-2 border-t border-white/[0.07] bg-[#161616] px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-7">
            <span>{movie && watchLog[movie.id] && <button type="button" onClick={() => { onRemove?.(movie.id); onClose(); }} className="remove-watched-button">Remove from Watched</button>}</span>
            <span className="flex gap-2">
              <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
              <button type="button" onClick={submit} disabled={!movie} className="save-log-button"><Check className="h-4 w-4" /><span>Save to Watchlog</span></button>
            </span>
          </footer>
        </div>
      </section>
    </div>
  );
}
