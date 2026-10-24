import { TMDBSearchResult, TMDBMovieDetails } from '../types/movie';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

if (!TMDB_API_KEY) {
  console.warn('TMDB API key not found. Some features may not work.');
}

export function getPosterUrl(path: string | null | undefined, size: 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export async function searchTMDB(query: string, type?: 'movie' | 'tv'): Promise<TMDBSearchResult[]> {
  if (!TMDB_API_KEY) return [];

  try {
    const mediaType = type || 'multi';
    const response = await fetch(
      `${TMDB_BASE_URL}/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return [];
  }
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
