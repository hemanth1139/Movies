// Test file to verify the app works without Supabase initially
// This can be removed after setting up the real database

import type { Movie } from '../types/movie';

export const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'Iron Man',
    type: 'Movie',
    genres: ['Superhero'],
    release_year: 2008,
    tmdb_id: 1726,
    poster_path: '/2n9Sgtp2SYoAvlKaVN0myZRDzUd.jpg',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
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
  {
    id: '4',
    title: 'Dark',
    type: 'TV Series',
    genres: ['Mystery', 'Sci-Fi', 'Thriller'],
    release_year: 2017,
    tmdb_id: 70523,
    poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];
