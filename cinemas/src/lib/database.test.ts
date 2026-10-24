// Test file to verify the app works without Supabase initially
// This can be removed after setting up the real database

import { Movie } from '../types/movie';

export const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'Iron Man',
    type: 'Movie',
    genres: ['Superhero'],
    release_year: 2008,
    tmdb_id: 1726,
    poster_path: '/2n9Sgtp2SYoAvlKaVN0myZRDzUd.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'The Dark Knight',
    type: 'Movie',
    genres: ['Superhero'],
    release_year: 2008,
    tmdb_id: 155,
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'The Conjuring',
    type: 'Movie',
    genres: ['Horror', 'Supernatural'],
    release_year: 2013,
    tmdb_id: 136096,
    poster_path: '/44s7u8V9Xg3myFDF0xL5I82eS9.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
