import type { Movie } from '../types/movie';
import { requestSupabase, supabase } from './supabase';
import { csvMovies } from './csvMovies';

const MOVIE_PAGE_SIZE = 250;
const MOVIES_RESOURCE = 'movies';

function moviesQuery(query: Record<string, string>): string {
  return `${MOVIES_RESOURCE}?${new URLSearchParams(query).toString()}`;
}

function reportDatabaseError(operation: string, error: { message: string; code?: string }): void {
  console.error(`${operation}:`, error);
}

export async function getMovies(onPage?: (movies: Movie[], isFirstPage: boolean) => void): Promise<Movie[]> {
  if (!supabase) {
    const result: Movie[] = [];
    for (let start = 0; start < csvMovies.length; start += MOVIE_PAGE_SIZE) {
      const page = csvMovies.slice(start, start + MOVIE_PAGE_SIZE);
      result.push(...page);
      onPage?.(page, start === 0);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    if (!csvMovies.length) onPage?.([], true);
    return result;
  }

  const result: Movie[] = [];
  for (let start = 0; ; start += MOVIE_PAGE_SIZE) {
    const { data, error } = await requestSupabase<Movie[]>(moviesQuery({ select: '*', order: 'title.asc' }), {
      headers: { Range: `${start}-${start + MOVIE_PAGE_SIZE - 1}` },
    });

    if (error) {
      reportDatabaseError('getMovies', error);
      onPage?.(csvMovies, true);
      return csvMovies;
    }

    const page = data ?? [];
    if (start === 0) onPage?.(page, true);
    else onPage?.(page, false);
    result.push(...page);
    if (page.length < MOVIE_PAGE_SIZE) break;
  }

  return result;
}

export async function getMovieById(id: string): Promise<Movie | null> {
  if (!supabase) return null;
  const { data, error } = await requestSupabase<Movie[]>(moviesQuery({ select: '*', id: `eq.${id}`, limit: '1' }));
  if (error) { reportDatabaseError('getMovieById', error); return null; }
  return data?.[0] ?? null;
}

export async function getMovieByTmdbId(tmdbId: number): Promise<Movie | null> {
  if (!supabase) return null;
  const { data, error } = await requestSupabase<Movie[]>(moviesQuery({ select: '*', tmdb_id: `eq.${tmdbId}`, limit: '1' }));
  if (error) { reportDatabaseError('getMovieByTmdbId', error); return null; }
  return data?.[0] ?? null;
}

export async function createMovie(
  movie: Omit<Movie, 'id' | 'created_at' | 'updated_at'>
): Promise<Movie | null> {
  if (!supabase) return null;

  // Keep optional TMDB display metadata in the client cache; the existing table
  // only stores the core collection fields and franchise name.
  const databaseMovie = {
    title: movie.title,
    type: movie.type,
    genres: movie.genres,
    franchise: movie.franchise,
    release_year: movie.release_year,
    tmdb_id: movie.tmdb_id,
    poster_path: movie.poster_path,
  };
  const { data, error } = await requestSupabase<Movie[]>(MOVIES_RESOURCE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(databaseMovie),
  });

  if (error) { reportDatabaseError('createMovie', error); return null; }
  return data?.[0] ?? null;
}

export async function updateMovie(
  id: string,
  updates: Partial<Omit<Movie, 'id' | 'created_at' | 'updated_at'>>
): Promise<Movie | null> {
  if (!supabase) return null;
  const { data, error } = await requestSupabase<Movie[]>(moviesQuery({ id: `eq.${id}`, select: '*' }), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(updates),
  });

  if (error) { reportDatabaseError('updateMovie', error); return null; }
  return data?.[0] ?? null;
}

export async function deleteMovie(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await requestSupabase<Array<{ id: string }>>(moviesQuery({ id: `eq.${id}`, select: 'id' }), {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });

  if (error) { reportDatabaseError('deleteMovie', error); return false; }
  return (data?.length ?? 0) > 0;
}

export async function restoreMovie(movie: Movie): Promise<Movie | null> {
  if (!supabase) return null;

  const databaseMovie = {
    id: movie.id,
    title: movie.title,
    type: movie.type,
    genres: movie.genres,
    franchise: movie.franchise,
    release_year: movie.release_year,
    tmdb_id: movie.tmdb_id,
    poster_path: movie.poster_path,
    created_at: movie.created_at,
  };
  const { data, error } = await requestSupabase<Movie[]>(MOVIES_RESOURCE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(databaseMovie),
  });

  if (error) { reportDatabaseError('restoreMovie', error); return null; }
  return data?.[0] ?? null;
}

export async function bulkCreateMovies(
  movies: Omit<Movie, 'id' | 'created_at' | 'updated_at'>[]
): Promise<Movie[]> {
  if (!supabase || movies.length === 0) return [];

  const { data, error } = await requestSupabase<Movie[]>(MOVIES_RESOURCE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(movies),
  });

  if (error) { reportDatabaseError('bulkCreateMovies', error); return []; }
  return data ?? [];
}
