import type { TMDBSearchResult, TMDBMovieDetails } from '../types/movie';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

if (!TMDB_API_KEY) {
  console.warn('TMDB API key not found. Some features may not work.');
}

export type TMDBSearchError = 'missing-key' | 'offline' | 'api' | null;

export type PosterSize = 'w92' | 'w185' | 'w500' | 'w780' | 'original';

export function getPosterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w500'
): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export async function searchTMDBDetailed(
  query: string,
  type?: 'movie' | 'tv'
): Promise<{ results: TMDBSearchResult[]; error: TMDBSearchError }> {
  if (!TMDB_API_KEY) return { results: [], error: 'missing-key' };

  try {
    const mediaType = type || 'multi';
    const response = await fetch(
      `${TMDB_BASE_URL}/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { results: data.results || [], error: null };
  } catch (error) {
    console.error('Error searching TMDB:', error);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return { results: [], error: offline ? 'offline' : 'api' };
  }
}

export async function searchTMDB(query: string, type?: 'movie' | 'tv'): Promise<TMDBSearchResult[]> {
  const { results } = await searchTMDBDetailed(query, type);
  return results;
}

export async function getMovieDetails(tmdbId: number, type: 'movie' | 'tv'): Promise<TMDBMovieDetails | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
}

export function getReleaseYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  return new Date(date).getFullYear();
}

export function tmdbErrorMessage(error: TMDBSearchError): string | null {
  if (error === 'missing-key') return 'TMDB is not configured. Add VITE_TMDB_API_KEY to your environment.';
  if (error === 'offline') return 'You appear to be offline. Check your connection and try again.';
  if (error === 'api') return 'Could not reach TMDB right now. Try again in a moment.';
  return null;
}
