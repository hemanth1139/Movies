import { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import type { Movie } from '../types/movie';
import MovieTable from './MovieTable';
import LogbookStats from './LogbookStats';
import type { WatchLogMap } from '../types/watchLog';
import { isAnimeTitle } from '../lib/animeUtils';

interface LogbookPageProps {
  movies: Movie[];
  watchLog: WatchLogMap;
  onMovieOpen: (movie: Movie) => void;
  deletedMovies: Movie[];
  onMovieRestore: (movie: Movie) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function LogbookPage({ movies, watchLog, onMovieOpen, deletedMovies, onMovieRestore, searchQuery, onSearchChange }: LogbookPageProps) {
  const [trashOpen, setTrashOpen] = useState(false);
  const movieCount = movies.filter((movie) => movie.type === 'Movie' && !isAnimeTitle(movie)).length;
  return (
    <div className="logbook-page">
      <div className="page-intro">
        <div>
          <h1>Logbook & Vault</h1>
          <p className="page-subtitle">Master database and analytics</p>
        </div>
      </div>

      <LogbookStats movies={movies} />

      <section className="collection-section">
        <div className="category-header">
          <div className="category-heading-copy">
            <h1>Master Database</h1>
            <p>{movieCount} movies · {movies.length} total watched titles</p>
          </div>
        </div>
        <MovieTable movies={movies} watchLog={watchLog} onOpen={onMovieOpen} searchQuery={searchQuery} onSearchChange={onSearchChange} />
      </section>

      <section className="recently-deleted">
        <button type="button" className="recently-deleted-toggle" aria-expanded={trashOpen} onClick={() => setTrashOpen((open) => !open)}>
          {trashOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          <strong>Recently Deleted</strong><span className="vault-count">{deletedMovies.length}</span>
        </button>
        {trashOpen && <div className="recently-deleted-list">
          {deletedMovies.length === 0 ? <p>Deleted movies and series will appear here so you can restore them.</p> : [...deletedMovies].reverse().map((movie) => (
            <div className="recently-deleted-row" key={movie.id}>
              <span><strong>{movie.title}</strong><small>{movie.type} · {movie.release_year ?? 'Year unknown'}</small></span>
              <button type="button" aria-label={`Restore ${movie.title}`} onClick={() => onMovieRestore(movie)}><RotateCcw aria-hidden="true" /> Restore</button>
            </div>
          ))}
        </div>}
      </section>
    </div>
  );
}
