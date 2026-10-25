import type { Movie } from '../types/movie';
import { supabase } from './supabase';
import { csvMovies } from './csvMovies';

let moviesLoadPromise: Promise<Movie[]> | null = null;

export function getMovies(): Promise<Movie[]> {
  if (moviesLoadPromise) return moviesLoadPromise;
  moviesLoadPromise = loadMovies().finally(() => { moviesLoadPromise = null; });
  return moviesLoadPromise;
}

async function loadMovies(): Promise<Movie[]> {
  if (!supabase) {
    return csvMovies;
  }

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('title');

  if (error) {
    console.error('getMovies:', error);
    return csvMovies;
  }

  return ((data ?? []) as Movie[]).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getMovieById(id: string): Promise<Movie | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) { console.error('getMovieById:', error); return null; }
  return data as Movie;
}

export async function getMovieByTmdbId(tmdbId: number): Promise<Movie | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .maybeSingle();

  if (error) { console.error('getMovieByTmdbId:', error); return null; }
  return data as Movie | null;
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
  const { data, error } = await supabase
    .from('movies')
    .insert(databaseMovie)
    .select()
    .single();

  if (error) { console.error('createMovie:', error); return null; }
  return data as Movie;
}

export async function updateMovie(
  id: string,
  updates: Partial<Omit<Movie, 'id' | 'created_at' | 'updated_at'>>
): Promise<Movie | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('movies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('updateMovie:', error); return null; }
  return data as Movie;
}

export async function deleteMovie(id: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('movies')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) { console.error('deleteMovie:', error); return false; }
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
  const { data, error } = await supabase
    .from('movies')
    .insert(databaseMovie)
    .select()
    .single();

  if (error) { console.error('restoreMovie:', error); return null; }
  return data as Movie;
}

export async function bulkCreateMovies(
  movies: Omit<Movie, 'id' | 'created_at' | 'updated_at'>[]
): Promise<Movie[]> {
  if (!supabase || movies.length === 0) return [];

  const { data, error } = await supabase
    .from('movies')
    .insert(movies)
    .select();

  if (error) { console.error('bulkCreateMovies:', error); return []; }
  return (data ?? []) as Movie[];
}
