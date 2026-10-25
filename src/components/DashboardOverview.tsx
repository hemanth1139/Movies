import { ArrowUpRight, Clock3, Clapperboard, Film, Plus, Sparkles, Tv } from 'lucide-react';
import type { Movie } from '../types/movie';
import type { WatchLogMap } from '../types/watchLog';
import { getPosterUrl } from '../lib/tmdb';

interface DashboardOverviewProps {
  movies: Movie[];
  watchLog: WatchLogMap;
  onMovieOpen: (movie: Movie) => void;
  onQuickEpisode: (movie: Movie) => void;
  onViewSeries: () => void;
}

function Sparkline({ tone = 'amber' }: { tone?: 'amber' | 'indigo' }) {
  return <svg className={`sparkline sparkline-${tone}`} viewBox="0 0 96 32" aria-hidden="true"><path d="M2 25 C12 23 14 18 23 21 S38 27 47 17 S60 12 67 16 S80 8 94 5" /><path d="M2 25 C12 23 14 18 23 21 S38 27 47 17 S60 12 67 16 S80 8 94 5 L94 32 L2 32 Z" className="sparkline-fill" /></svg>;
}

export default function DashboardOverview({ movies, watchLog, onMovieOpen, onQuickEpisode, onViewSeries }: DashboardOverviewProps) {
  const totalMovies = movies.filter((movie) => movie.type === 'Movie').length;
  const series = movies.filter((movie) => movie.type === 'TV Series');
  const episodeTotal = Object.values(watchLog).reduce((sum, entry) => sum + entry.watchedEpisodes.length, 0);
  const genreCounts = new Map<string, number>();
  movies.forEach((movie) => movie.genres.forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)));
  const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <>
      <section className="kpi-grid" aria-label="Library overview">
        <article className="kpi-card"><div className="kpi-top"><span className="kpi-icon amber-icon"><Film /></span><span className="kpi-trend">Library</span></div><strong className="kpi-value">{totalMovies}</strong><span className="kpi-label">Total Movies</span><Sparkline /></article>
        <article className="kpi-card"><div className="kpi-top"><span className="kpi-icon indigo-icon"><Tv /></span><span className="kpi-trend">Tracked</span></div><strong className="kpi-value">{episodeTotal}</strong><span className="kpi-label">Episodes Watched</span><Sparkline tone="indigo" /></article>
        <article className="kpi-card"><div className="kpi-top"><span className="kpi-icon slate-icon"><Clock3 /></span><span className="kpi-trend">Runtime</span></div><strong className="kpi-value kpi-mono">—</strong><span className="kpi-label">Total Hours Logged</span><span className="kpi-note">Runtime isn’t in your collection data yet</span></article>
        <article className="kpi-card"><div className="kpi-top"><span className="kpi-icon amber-icon"><Sparkles /></span><span className="kpi-trend">By genre</span></div><strong className="kpi-value kpi-genre">{topGenre}</strong><span className="kpi-label">Top Genre</span><Sparkline /></article>
      </section>

      <section className="dashboard-section" aria-labelledby="continue-heading">
        <div className="section-heading"><div><p className="section-kicker">PICK UP WHERE YOU LEFT OFF</p><h2 id="continue-heading">Continue Watching</h2></div><button type="button" onClick={onViewSeries} className="view-all-link">All series <ArrowUpRight className="h-4 w-4" /></button></div>
        {series.length === 0 ? <div className="section-empty"><Tv className="h-5 w-5" /><span>Add a series to see it here.</span></div> : (
          <div className="continue-grid">
            {series.slice(0, 4).map((movie) => {
              const entry = watchLog[movie.id];
              const watched = entry?.watchedEpisodes.length ?? 0;
              const nextEpisode = (entry?.watchedEpisodes[entry.watchedEpisodes.length - 1] ?? 0) + 1;
              const poster = getPosterUrl(movie.poster_path, 'w500');
              return (
                <article key={movie.id} className="continue-card" style={poster ? { backgroundImage: `linear-gradient(90deg,rgba(13,16,23,.96) 0%,rgba(13,16,23,.78) 60%,rgba(13,16,23,.38) 100%),url("${poster}")` } : undefined}>
                  <button type="button" className="continue-info" onClick={() => onMovieOpen(movie)} aria-label={`Log progress for ${movie.title}`}>
                    <span className="continue-tag"><Tv className="h-3 w-3" /> SERIES</span>
                    <strong>{movie.title}</strong>
                    <span className="episode-next">Next: Episode {nextEpisode.toString().padStart(2, '0')}</span>
                    <span className="episode-progress"><span style={{ width: `${Math.min(100, watched * 10)}%` }} /></span>
                    <span className="episode-caption">{watched} episodes logged</span>
                  </button>
                  <button type="button" className="episode-add" onClick={() => onQuickEpisode(movie)} aria-label={`Log one episode of ${movie.title}`}><Plus className="h-4 w-4" /> 1 Ep</button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export function RecentHeading({ count }: { count: number }) {
  return <div className="section-heading recent-heading"><div><p className="section-kicker">YOUR LATEST ADDITIONS</p><h2>Recently Logged</h2></div><span className="recent-count"><Clapperboard className="h-4 w-4" /> {count} titles</span></div>;
}
