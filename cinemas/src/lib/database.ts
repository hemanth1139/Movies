import { Movie } from '../types/movie';
import { supabase } from './supabase';
import { mockMovies } from './database.test';

export async function getMovies(): Promise<Movie[]> {
  if (!supabase) {
    console.log('Using mock data — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the database.');
    return mockMovies;
  }

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('title');

  if (error) { console.error('getMovies:', error); return []; }
  return (data ?? []) as Movie[];
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

  const { data, error } = await supabase
    .from('movies')
    .insert(movie)
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

  const { error } = await supabase
    .from('movies')
    .delete()
    .eq('id', id);

  if (error) { console.error('deleteMovie:', error); return false; }
  return true;
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
