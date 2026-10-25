import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clapperboard, Film, Plus, Star, Tv, X } from 'lucide-react';
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
}

export default function WatchLogModal({ isOpen, movies, initialMovie, watchLog, onClose, onSave, onAddTitle }: WatchLogModalProps) {
  const [movieId, setMovieId] = useState(initialMovie?.id ?? '');
  const [rating, setRating] = useState(0);
  const [watchedDate, setWatchedDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalSeasons, setTotalSeasons] = useState(0);
  const [watchedSeasons, setWatchedSeasons] = useState<number[]>([]);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<Array<{ season_number: number; episode_count: number }>>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const movie = useMemo(() => initialMovie ?? movies.find((item) => item.id === movieId) ?? null, [initialMovie, movies, movieId]);
  const poster = movie ? getPosterUrl(movie.poster_path, 'w500') : undefined;

  useEffect(() => {
    if (!isOpen) return;
    const nextId = initialMovie?.id ?? movieId;
    setMovieId(nextId);
    const entry = nextId ? watchLog[nextId] : undefined;
    const data = entry ?? emptyWatchLogEntry();
    setRating(data.rating);
    setWatchedDate(data.watchedDate || new Date().toISOString().slice(0, 10));
    setTotalSeasons(data.totalSeasons || movie?.total_seasons || 0);
    setWatchedSeasons(data.watchedSeasons ?? []);
  }, [isOpen, initialMovie?.id, movieId, movie, watchLog]);

  useEffect(() => {
    if (!isOpen || !movie) return;
    let cancelled = false;
    setIsMetadataLoading(true);
    setRuntime(movie.type === 'Movie' ? movie.runtime ?? null : null);
    setSeasonDetails([]);

    void getVerifiedMovieDetails(movie).then((details) => {
      if (cancelled) return;
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
  }, [isOpen, movie?.id, movie?.tmdb_id, movie?.type, movie?.release_year]);

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

  if (!isOpen) return null;

  const toggleSeason = (season: number) => {
    setWatchedSeasons((current) => current.includes(season)
      ? current.filter((item) => item !== season)
      : [...current, season].sort((a, b) => a - b));
  };

  const seasonRows = seasonDetails.length
    ? seasonDetails
    : Array.from({ length: totalSeasons }, (_, index) => ({
      season_number: index + 1,
      episode_count: movie?.season_episode_counts?.[index] ?? -1,
    }));

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ') || '< 1m';
  };

  const submit = () => {
    if (!movie) return;
    onSave(movie.id, { rating, watchedDate, rewatch: false, review: '', watchedEpisodes: [], totalSeasons, watchedSeasons });
    onClose();
  };

  return (
    <div className="watch-modal-backdrop fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5" onClick={onClose}>
      <section className="watch-modal relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="watch-modal-title" onClick={(event) => event.stopPropagation()}>
        {poster && <div className="watch-modal-backdrop-art" style={{ backgroundImage: `url("${poster}")` }} aria-hidden="true" />}
        <div className="watch-modal-scrim" aria-hidden="true" />
        <div className="relative z-10">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Clapperboard className="h-4 w-4 text-amber-400" /> Log a watch</div>
            <button type="button" onClick={onClose} className="icon-button" aria-label="Close watch log"><X className="h-4 w-4" /></button>
          </header>

          <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[220px_1fr]">
            <aside className="hidden md:block">
              {poster ? <img src={poster} alt={`${movie?.title ?? 'Selected title'} poster`} className="watch-poster" /> : (
                <div className="watch-poster poster-placeholder"><Film className="h-10 w-10" /></div>
              )}
            </aside>

            <div className="min-w-0">
              {movie ? (
                <div className="selected-media flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-amber-400">{movie?.type === 'TV Series' ? <Tv /> : <Film />}</span>
                  <div className="min-w-0"><h2 id="watch-modal-title" className="truncate text-xl font-semibold text-white">{movie?.title}</h2><p className="text-xs text-gray-400">{movie?.release_year ?? movie?.release_date?.slice(0, 4) ?? 'Year unknown'}</p></div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select id="watch-title-select" value={movieId} onChange={(event) => setMovieId(event.target.value)} className="watch-input min-w-0 flex-1">
                    <option value="">Choose a title from your library</option>
                    {movies.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.type}</option>)}
                  </select>
                  <button type="button" onClick={onAddTitle} className="secondary-button shrink-0"><Plus className="h-4 w-4" /> Add title</button>
                </div>
              )}

              {movie?.type === 'Movie' && <p className="mt-2 text-xs text-gray-400">Runtime: {runtime ? formatRuntime(runtime) : isMetadataLoading ? 'Loading…' : 'Unavailable'}</p>}

              {movie && <>
                <div className="mt-4">
                  <span className="field-label">Category</span>
                  <div className="flex flex-wrap gap-2">{movie.genres.length ? movie.genres.map((genre) => <span className="meta-pill" key={genre}>{genre}</span>) : <span className="text-xs text-gray-500">No category listed</span>}</div>
                </div>
                <div className="watch-form-grid mt-6">
                  <div className="form-block">
                    <span className="field-label">Your rating</span>
                    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        return <button key={value} type="button" onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setRating(event.clientX - rect.left < rect.width / 2 ? value - 0.5 : value);
                        }} className="rating-star" aria-label={`Rate ${value} stars`} aria-checked={rating >= value - 0.5} role="radio">
                          <Star className={rating >= value ? 'fill-amber-400 text-amber-400' : rating >= value - 0.5 ? 'fill-amber-400/50 text-amber-400' : 'text-gray-600'} />
                        </button>;
                      })}
                      <span className="ml-2 font-mono text-xs text-gray-400">{rating ? rating.toFixed(1) : '—'}</span>
                    </div>
                  </div>
                  <label className="form-block"><span className="field-label">Watched date</span><span className="date-field"><CalendarDays className="h-4 w-4 text-gray-500" /><input type="date" value={watchedDate} onChange={(event) => setWatchedDate(event.target.value)} className="watch-input" /></span></label>
                </div>

                {movie.type === 'TV Series' && (
                  <details className="episode-accordion mt-6" open>
                    <summary><span><Tv className="h-4 w-4 text-amber-400" /> Seasons watched</span><span className="episode-count">{watchedSeasons.length} of {totalSeasons || '—'}</span></summary>
                    <div className="episode-checklist">
                      {isMetadataLoading && seasonRows.length === 0 && <p className="py-4 text-xs text-gray-400">Loading seasons…</p>}
                      {!isMetadataLoading && seasonRows.length === 0 && <p className="py-4 text-xs text-gray-400">Season details are unavailable right now.</p>}
                      {seasonRows.length > 0 && <>
                        <p className="mb-3 text-xs text-gray-400">Select each season you have watched.</p>
                        <div className="season-checklist" role="group" aria-label="Seasons watched">
                          {seasonRows.map(({ season_number: season, episode_count: episodeCount }) => {
                            return <label className="season-check-row" key={season}>
                              <input type="checkbox" checked={watchedSeasons.includes(season)} onChange={() => toggleSeason(season)} />
                              <span className="season-check-box" aria-hidden="true"><Check className="h-3.5 w-3.5" /></span>
                              <span className="season-check-title">Season {season}</span>
                              <span className="season-episode-count">{episodeCount < 0 ? 'Episodes unavailable' : `${episodeCount} ${episodeCount === 1 ? 'episode' : 'episodes'}`}</span>
                            </label>;
                          })}
                        </div>
                        <div className="season-progress-track mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={totalSeasons} aria-valuenow={watchedSeasons.length} aria-label="Season progress"><span style={{ width: `${Math.min(100, (watchedSeasons.length / totalSeasons) * 100)}%` }} /></div>
                        <p className="mt-2 text-xs text-gray-400">{watchedSeasons.length} of {totalSeasons} seasons watched</p>
                      </>}
                    </div>
                  </details>
                )}
              </>}

              <footer className="watch-modal-actions mt-7 flex justify-end gap-2 border-t border-white/[0.07] pt-5">
                <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
                <button type="button" onClick={submit} disabled={!movie} className="amber-button"><Check className="h-4 w-4" /><span>Save log</span></button>
              </footer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
