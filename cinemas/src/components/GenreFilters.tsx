import { useState } from 'react';

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
] as const;

type Genre = typeof GENRES[number];

interface GenreFiltersProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
}

export default function GenreFilters({ selectedGenres, onGenreToggle }: GenreFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayGenres = isExpanded ? GENRES : GENRES.slice(0, 8);
  const hasMore = GENRES.length > 8;

  return (
    <div className="border-b border-surface bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex flex-wrap gap-2">
            {displayGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => onGenreToggle(genre)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedGenres.includes(genre)
                    ? 'bg-accent text-background'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                }`}
              >
                {genre}
              </button>
            ))}
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-accent hover:bg-surface transition-colors"
              >
                {isExpanded ? 'Show less' : `+${GENRES.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
