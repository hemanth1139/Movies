import type { Movie } from '../types/movie';

const BUNDLED_ANIME_TITLES = new Set([
  'a silent voice: the movie',
  'your name.',
  'i want to eat your pancreas',
  'weathering with you',
  'suzume',
  'grave of the fireflies',
  'perfect blue',
  'naruto',
  'naruto shippuden',
  'death note',
  'spy x family',
  'demon slayer: kimetsu no yaiba',
  'dan da dan',
  'solo leveling',
]);

/**
 * Consolidated anime detection logic
 * Avoid confusing live-action Japanese titles and Western animation with anime.
 * The title list keeps known bundled anime classified while offline, before
 * TMDB language metadata is available.
 */
export function isAnimeTitle(movie: Movie): boolean {
  const normalizedTitle = movie.title.normalize('NFKC').trim().toLowerCase();
  const hasAnimationGenre = movie.genres.some((genre) => genre.toLowerCase().includes('animation'));
  const isJapanese = movie.original_language === 'ja' || Boolean(movie.origin_country?.includes('JP'));
  return (movie.type as string) === 'Anime'
    || BUNDLED_ANIME_TITLES.has(normalizedTitle)
    || (isJapanese && hasAnimationGenre);
}
