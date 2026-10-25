import { useEffect, useMemo, useState } from 'react';
import { ArrowUpAZ, Clock3, LayoutGrid, List, X } from 'lucide-react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import type { FilterType } from './components/Navigation';
import GenreFilters from './components/GenreFilters';
import PosterGrid, { SkeletonGrid } from './components/PosterGrid';
import AddTitleModal from './components/AddTitleModal';
import ImportModal from './components/ImportModal';
import EditModal from './components/EditModal';
import type { Movie } from './types/movie';
import { deleteMovie, getMovies } from './lib/database';
import { supabase } from './lib/supabase';

type SortMode = 'az' | 'recent';
type ViewMode = 'grid' | 'list';

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('All');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('az');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  useEffect(() => {
    void loadMovies();
  }, []);

  const loadMovies = async () => {
    setLoading(true);
    const data = await getMovies();
    setMovies(data);
    setLoading(false);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const hasActiveFilters = currentFilter !== 'All' || selectedGenres.length > 0 || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setCurrentFilter('All');
    setSelectedGenres([]);
    setSearchQuery('');
  };

  const handleTitleAdded = (movie: Movie) => {
    setMovies((prev) => [...prev, movie]);
  };

  const handleMovieEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setIsEditModalOpen(true);
  };

  const handleMovieUpdated = (updatedMovie: Movie) => {
    setMovies((prev) => prev.map((movie) => (movie.id === updatedMovie.id ? updatedMovie : movie)));
  };

  const handleMovieDelete = async (movie: Movie) => {
    if (!supabase) {
      setMovies((prev) => prev.filter((item) => item.id !== movie.id));
      return;
    }
    const deleted = await deleteMovie(movie.id);
    if (deleted) {
      setMovies((prev) => prev.filter((item) => item.id !== movie.id));
    }
  };

  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = movies.filter((movie) => {
      if (currentFilter !== 'All' && movie.type !== currentFilter) return false;

      if (selectedGenres.length > 0) {
        const hasMatchingGenre = selectedGenres.some((genre) =>
          movie.genres.some((item) => item.toLowerCase().includes(genre.toLowerCase()))
        );
        if (!hasMatchingGenre) return false;
      }

      if (query && !movie.title.toLowerCase().includes(query)) return false;
      return true;
    });

    next.sort((a, b) => {
      if (sortMode === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.title.localeCompare(b.title);
    });

    return next;
  }, [movies, currentFilter, selectedGenres, searchQuery, sortMode]);

  const movieCount = filteredMovies.filter((movie) => movie.type === 'Movie').length;
  const seriesCount = filteredMovies.filter((movie) => movie.type === 'TV Series').length;
  const statsLabel = `${filteredMovies.length} ${filteredMovies.length === 1 ? 'title' : 'titles'} · ${movieCount} ${movieCount === 1 ? 'movie' : 'movies'} · ${seriesCount} series`;

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Navigation currentFilter={currentFilter} onFilterChange={setCurrentFilter} />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs text-secondary hover:text-primary hover:bg-surface-2"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>
          <GenreFilters
            movies={movies}
            selectedGenres={selectedGenres}
            onGenreToggle={handleGenreToggle}
          />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">Your library</p>
            <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">Your collection</h1>
            <p className="mt-2 text-sm text-secondary">A cozy home for everything you’ve watched.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
          <p className="text-sm text-secondary" aria-live="polite">
            {loading ? 'Loading collection…' : statsLabel}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-wl-sm bg-surface p-1" role="group" aria-label="Sort">
              <button
                type="button"
                onClick={() => setSortMode('az')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-wl ${
                  sortMode === 'az' ? 'bg-surface-2 text-primary' : 'text-secondary hover:text-primary'
                }`}
                aria-pressed={sortMode === 'az'}
              >
                <ArrowUpAZ className="h-3.5 w-3.5" />
                A–Z
              </button>
              <button
                type="button"
                onClick={() => setSortMode('recent')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-wl ${
                  sortMode === 'recent' ? 'bg-surface-2 text-primary' : 'text-secondary hover:text-primary'
                }`}
                aria-pressed={sortMode === 'recent'}
              >
                <Clock3 className="h-3.5 w-3.5" />
                Recently added
              </button>
            </div>
            <div className="flex rounded-wl-sm bg-surface p-1" role="group" aria-label="View">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-md p-1.5 transition-colors duration-wl ${
                  viewMode === 'grid' ? 'bg-surface-2 text-primary' : 'text-secondary hover:text-primary'
                }`}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-md p-1.5 transition-colors duration-wl ${
                  viewMode === 'list' ? 'bg-surface-2 text-primary' : 'text-secondary hover:text-primary'
                }`}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          </div>
        </div>

        {movies.length === 0 && !loading && (
          <p className="mb-4 text-center text-xs text-secondary">
            Already have a CSV?{' '}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="text-accent hover:underline"
            >
              Import it
            </button>
          </p>
        )}

        {loading ? (
          <SkeletonGrid view={viewMode} />
        ) : (
          <PosterGrid
            movies={filteredMovies}
            view={viewMode}
            isEmptyCollection={movies.length === 0}
            hasActiveFilters={hasActiveFilters}
            onAddClick={() => setIsAddModalOpen(true)}
            onMovieEdit={handleMovieEdit}
            onMovieDelete={(movie) => void handleMovieDelete(movie)}
          />
        )}
      </main>

      <AddTitleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTitleAdded={handleTitleAdded}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={loadMovies}
      />

      {editingMovie && (
        <EditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMovie(null);
          }}
          movie={editingMovie}
          onMovieUpdated={handleMovieUpdated}
        />
      )}

      <footer className="mt-12 border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-secondary">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="mt-2 text-xs text-secondary/70">
            Data and images provided by{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              The Movie Database (TMDB)
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
