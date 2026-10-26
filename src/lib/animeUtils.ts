import type { Movie } from '../types/movie';

/**
 * Consolidated anime detection logic
 * A title is considered anime if:
 * - Type is explicitly 'Anime'
 * - Original language is Japanese
 * - Any genre contains 'animation'
 */
export function isAnimeTitle(movie: Movie): boolean {
  return (movie.type as string) === 'Anime'
    || movie.original_language === 'ja'
    || movie.genres.some((genre) => genre.toLowerCase().includes('animation'));
}
