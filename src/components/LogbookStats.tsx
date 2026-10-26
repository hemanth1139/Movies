import type { Movie } from '../types/movie';
import { Clapperboard, Film, Sparkles, Tv } from 'lucide-react';
import { isAnimeTitle } from '../lib/animeUtils';

interface LogbookStatsProps {
  movies: Movie[];
}

export default function LogbookStats({ movies }: LogbookStatsProps) {
  const totalMovies = movies.filter((movie) => movie.type === 'Movie' && !isAnimeTitle(movie)).length;
  const totalSeries = movies.filter((movie) => movie.type === 'TV Series' && !isAnimeTitle(movie)).length;
  const totalAnime = movies.filter(isAnimeTitle).length;

  return (
    <div className="kpi-grid">
      <div className="kpi-card"><div className="kpi-value">{movies.length}</div><div className="kpi-label">Total Logged</div><Clapperboard className="kpi-watermark" aria-hidden="true" /></div>
      <div className="kpi-card"><div className="kpi-value">{totalMovies}</div><div className="kpi-label">Movies</div><Film className="kpi-watermark" aria-hidden="true" /></div>
      <div className="kpi-card"><div className="kpi-value">{totalSeries}</div><div className="kpi-label">Series</div><Tv className="kpi-watermark" aria-hidden="true" /></div>
      <div className="kpi-card"><div className="kpi-value">{totalAnime}</div><div className="kpi-label">Anime</div><Sparkles className="kpi-watermark" aria-hidden="true" /></div>
    </div>
  );
}
