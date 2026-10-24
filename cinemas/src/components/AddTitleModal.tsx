import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { TMDBSearchResult, Movie, MediaType } from '../types/movie';
import { searchTMDB, getReleaseYear, getPosterUrl } from '../lib/tmdb';
import { getMovieByTmdbId, createMovie } from '../lib/database';

interface AddTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTitleAdded: (movie: Movie) => void;
}

const GENRES = [
  'Horror',
  'Psychological Thriller',
  'Mystery',
  'Crime',
  'Romance',
  'Drama',
  'Sci-Fi',
  'Fantasy',
  'Adventure',
  'Comedy',
  'Animation',
  'Superhero',
  'Thriller',
  'Action',
  'Spy',
  'Historical Drama',
  'K-Drama',
  'Supernatural',
  'Space',
];

export default function AddTitleModal({ isOpen, onClose, onTitleAdded }: AddTitleModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TMDBSearchResult | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType>('Movie');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setSelectedType('Movie');
    setSelectedGenres([]);
    setIsSearching(false);
    setIsAdding(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = await searchTMDB(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectResult = async (result: TMDBSearchResult) => {
    setSelectedResult(result);
    // Use media_type from the search result — TV shows also have a `title` field
    // so checking `details.title` is unreliable
    setSelectedType(result.media_type === 'tv' ? 'TV Series' : 'Movie');
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddTitle = async () => {
    if (!selectedResult || selectedGenres.length === 0) return;

    setIsAdding(true);

    // Check for duplicates
    const existing = await getMovieByTmdbId(selectedResult.id);
    if (existing) {
      alert('This title is already in your collection');
      setIsAdding(false);
      return;
    }

    const movie: Omit<Movie, 'id' | 'created_at' | 'updated_at'> = {
      title: selectedResult.title || selectedResult.name || '',
      type: selectedType,
      genres: selectedGenres,
      release_year: getReleaseYear(selectedResult.release_date || selectedResult.first_air_date),
      tmdb_id: selectedResult.id,
      poster_path: selectedResult.poster_path,
    };

    const created = await createMovie(movie);
    if (created) {
      onTitleAdded(created);
      onClose();
    }

    setIsAdding(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-background">
          <h2 className="text-xl font-semibold text-primary">Add Title</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors text-secondary hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedResult ? (
            // Search View
            <div>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for a movie or TV series..."
                  className="w-full pl-10 pr-4 py-3 bg-background text-primary placeholder:text-secondary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-accent animate-spin" />
                )}
              </div>

              <div className="grid gap-3">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="flex items-center gap-4 p-3 bg-background rounded-lg hover:bg-background/80 transition-colors text-left"
                  >
                    {result.poster_path ? (
                      <img
                        src={getPosterUrl(result.poster_path)}
                        alt={result.title || result.name}
                        className="w-16 h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-surface rounded flex items-center justify-center">
                        <span className="text-secondary/50 text-xs">No poster</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-primary">
                        {result.title || result.name}
                      </h3>
                      <p className="text-sm text-secondary mt-1">
                        {result.release_date || result.first_air_date
                          ? new Date(result.release_date || result.first_air_date).getFullYear()
                          : 'Unknown year'}
                      </p>
                      <p className="text-xs text-secondary/60 mt-1 capitalize">
                        {result.media_type === 'tv' ? 'TV Series' : 'Movie'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className="text-center text-secondary py-8">No results found</p>
              )}
            </div>
          ) : (
            // Details View
            <div>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-accent hover:text-accent/80 text-sm mb-4"
              >
                ← Back to search
              </button>

              <div className="flex gap-6 mb-6">
                {selectedResult.poster_path ? (
                  <img
                    src={getPosterUrl(selectedResult.poster_path)}
                    alt={selectedResult.title || selectedResult.name}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-48 bg-surface rounded-lg flex items-center justify-center">
                    <span className="text-secondary/50 text-xs">No poster</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-primary mb-2">
                    {selectedResult.title || selectedResult.name}
                  </h3>
                  <p className="text-secondary mb-4">
                    {selectedResult.release_date || selectedResult.first_air_date
                      ? new Date(selectedResult.release_date || selectedResult.first_air_date).getFullYear()
                      : 'Unknown year'}
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-primary mb-2">Type</label>
                    <div className="flex gap-2">
                      {(['Movie', 'TV Series'] as MediaType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedType === type
                              ? 'bg-accent text-background'
                              : 'bg-background text-secondary hover:text-primary'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Genres (select at least one)</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => handleGenreToggle(genre)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            selectedGenres.includes(genre)
                              ? 'bg-accent text-background'
                              : 'bg-background text-secondary hover:text-primary'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-background">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTitle}
                  disabled={selectedGenres.length === 0 || isAdding}
                  className="px-6 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add to Collection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
