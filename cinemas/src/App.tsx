import { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import GenreFilters from './components/GenreFilters';
import PosterGrid from './components/PosterGrid';
import SearchBar from './components/SearchBar';
import AddTitleModal from './components/AddTitleModal';
import ImportModal from './components/ImportModal';
import EditModal from './components/EditModal';
import { Movie, MediaType } from './types/movie';
import { getMovies } from './lib/database';

type FilterType = MediaType | 'All' | 'Anime';

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('All');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  useEffect(() => {
    loadMovies();
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTitleAdded = (movie: Movie) => {
    setMovies((prev) => [...prev, movie]);
  };

  const handleImportComplete = () => {
    loadMovies();
  };

  const handleMovieEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setIsEditModalOpen(true);
  };

  const handleMovieUpdated = (updatedMovie: Movie) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === updatedMovie.id ? updatedMovie : m))
    );
  };

  // Filter movies
  const filteredMovies = movies.filter((movie) => {
    // Type filter
    if (currentFilter === 'Anime') {
      const isAnime = movie.genres.some(g => g.toLowerCase().includes('anime'));
      if (!isAnime) return false;
    } else if (currentFilter !== 'All') {
      if (movie.type !== currentFilter) return false;
    }

    // Genre filter
    if (selectedGenres.length > 0) {
      const hasMatchingGenre = selectedGenres.some((genre) =>
        movie.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()))
      );
      if (!hasMatchingGenre) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!movie.title.toLowerCase().includes(query)) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSearchClick={() => setIsSearchOpen(true)}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <Navigation
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
      />

      <GenreFilters
        selectedGenres={selectedGenres}
        onGenreToggle={handleGenreToggle}
      />

      <SearchBar
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleSearch}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">
            Your personal cinema.
          </h1>
          <p className="text-secondary">
            Every film and series you've watched, in one place.
          </p>
        </div>

        {/* Import Button (only show if no movies) */}
        {movies.length === 0 && !loading && (
          <div className="mb-8 p-6 bg-surface rounded-lg border border-background">
            <h3 className="text-lg font-semibold text-primary mb-2">Import Your Collection</h3>
            <p className="text-secondary text-sm mb-4">
              Import your existing CSV file to populate your collection.
            </p>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              Import CSV
            </button>
          </div>
        )}

        {/* Collection */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-secondary">Loading collection...</p>
            </div>
          </div>
        ) : (
          <PosterGrid
            movies={filteredMovies}
            onMovieEdit={handleMovieEdit}
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
        onImportComplete={handleImportComplete}
      />

      {editingMovie && (
        <EditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          movie={editingMovie}
          onMovieUpdated={handleMovieUpdated}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-surface bg-background py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-secondary text-xs">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="text-secondary/60 text-xs mt-2">
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
