import { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { Movie, MediaType } from '../types/movie';
import { searchTMDB, getMovieDetails, getReleaseYear, getPosterUrl } from '../lib/tmdb';
import { updateMovie } from '../lib/database';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  onMovieUpdated: (movie: Movie) => void;
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

export default function EditModal({ isOpen, onClose, movie, onMovieUpdated }: EditModalProps) {
  const [title, setTitle] = useState(movie.title);
  const [type, setType] = useState<MediaType>(movie.type);
  const [genres, setGenres] = useState<string[]>(movie.genres);
  const [franchise, setFranchise] = useState(movie.franchise || '');
  const [releaseYear, setReleaseYear] = useState(movie.release_year?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  // Poster search
  const [posterSearchQuery, setPosterSearchQuery] = useState('');
  const [posterSearchResults, setPosterSearchResults] = useState<any[]>([]);
  const [isSearchingPoster, setIsSearchingPoster] = useState(false);
  const [selectedPosterPath, setSelectedPosterPath] = useState(movie.poster_path);

  useEffect(() => {
    if (isOpen) {
      setTitle(movie.title);
      setType(movie.type);
      setGenres(movie.genres);
      setFranchise(movie.franchise || '');
      setReleaseYear(movie.release_year?.toString() || '');
      setSelectedPosterPath(movie.poster_path);
      setPosterSearchQuery('');
      setPosterSearchResults([]);
    }
  }, [isOpen, movie]);

  const handleGenreToggle = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handlePosterSearch = async (query: string) => {
    setPosterSearchQuery(query);
    if (query.length < 2) {
      setPosterSearchResults([]);
      return;
    }

    setIsSearchingPoster(true);
    const searchType = type === 'TV Series' ? 'tv' : 'movie';
    const results = await searchTMDB(query, searchType);
    setPosterSearchResults(results);
    setIsSearchingPoster(false);
  };

  const handleSelectPoster = (posterPath: string) => {
    setSelectedPosterPath(posterPath);
    setPosterSearchResults([]);
    setPosterSearchQuery('');
  };

  const handleSave = async () => {
    setIsSaving(true);

    const updated = await updateMovie(movie.id, {
      title,
      type,
      genres,
      franchise: franchise || undefined,
      release_year: releaseYear ? parseInt(releaseYear) : undefined,
      poster_path: selectedPosterPath,
    });

    if (updated) {
      onMovieUpdated(updated);
      onClose();
    }

    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-background">
          <h2 className="text-xl font-semibold text-primary">Edit Title</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors text-secondary hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-background text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Type</label>
              <div className="flex gap-2">
                {(['Movie', 'TV Series'] as MediaType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      type === t
                        ? 'bg-accent text-background'
                        : 'bg-background text-secondary hover:text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Genres</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleGenreToggle(genre)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      genres.includes(genre)
                        ? 'bg-accent text-background'
                        : 'bg-background text-secondary hover:text-primary'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Franchise */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Franchise (optional)</label>
              <input
                type="text"
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
                placeholder="e.g., Marvel, Harry Potter"
                className="w-full px-4 py-2 bg-background text-primary placeholder:text-secondary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Release Year */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Release Year (optional)</label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="e.g., 2024"
                className="w-full px-4 py-2 bg-background text-primary placeholder:text-secondary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Poster */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Poster</label>
              <div className="flex gap-4 mb-4">
                {selectedPosterPath ? (
                  <img
                    src={getPosterUrl(selectedPosterPath)}
                    alt={title}
                    className="w-24 h-36 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-36 bg-background rounded-lg flex items-center justify-center">
                    <span className="text-secondary/50 text-xs">No poster</span>
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                <input
                  type="text"
                  value={posterSearchQuery}
                  onChange={(e) => handlePosterSearch(e.target.value)}
                  placeholder="Search for a different poster..."
                  className="w-full pl-10 pr-4 py-2 bg-background text-primary placeholder:text-secondary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
                {isSearchingPoster && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                )}
              </div>

              {posterSearchResults.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {posterSearchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectPoster(result.poster_path)}
                      className="relative group"
                    >
                      {result.poster_path ? (
                        <img
                          src={getPosterUrl(result.poster_path)}
                          alt={result.title || result.name}
                          className="w-full aspect-[2/3] object-cover rounded hover:ring-2 hover:ring-accent transition-all"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-background rounded flex items-center justify-center">
                          <span className="text-secondary/50 text-xs">No poster</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-background">
          <button
            onClick={onClose}
            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
