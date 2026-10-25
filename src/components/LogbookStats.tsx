import type { Movie } from '../types/movie';
import { Clapperboard, Film, Sparkles, Tv } from 'lucide-react';

interface LogbookStatsProps {
  movies: Movie[];
}

export default function LogbookStats({ movies }: LogbookStatsProps) {
  const isAnime = (movie: Movie) => (movie.type as string) === 'Anime' || movie.original_language === 'ja';
  const totalMovies = movies.filter((movie) => movie.type === 'Movie' && !isAnime(movie)).length;
  const totalSeries = movies.filter((movie) => movie.type === 'TV Series' && !isAnime(movie)).length;
  const totalAnime = movies.filter(isAnime).length;

  return (
    <div className="kpi-grid">
      <div className="kpi-card"><div className="kpi-value">{movies.length}</div><div className="kpi-label">Total Logged</div><Clapperboard className="kpi-watermark" aria-hidden="true" /></div>
      <div className="kpi-card"><div className="kpi-value">{totalMovies}</div><div className="kpi-label">Movies</div><Film className="kpi-watermark" aria-hidden="true" /></div>
      <div className="kpi-card"><div className="kpi-value">{totalSeries}</div><div className="kpi-label">Series</div><Tv className="kpi-watermark" aria-hidden="true" /></div>
      <div className="kpi-card"><div className="kpi-value">{totalAnime}</div><div className="kpi-label">Anime</div><Sparkles className="kpi-watermark" aria-hidden="true" /></div>
    </div>
  );
}
