import type { Movie } from '../types/movie';
import posterJson from './cachedMoviePosters.json?raw';

type BundledPoster = Pick<Movie, 'poster_path' | 'tmdb_id' | 'release_year' | 'overview'>;
const bundledPosters = JSON.parse(posterJson) as Record<string, BundledPoster>;

export function applyBundledPosters(movies: Movie[]): Movie[] {
  return movies.map((movie) => {
    const title = movie.title.trim().toLowerCase().replace(/\s+/g, ' ');
    const metadata = bundledPosters[`${movie.type.toLowerCase()}:${title}`];
    if (!metadata) return movie;

    return {
      ...movie,
      ...metadata,
      poster_path: movie.poster_path || metadata.poster_path,
      tmdb_id: movie.tmdb_id || metadata.tmdb_id,
      release_year: movie.release_year || metadata.release_year,
      overview: movie.overview || metadata.overview,
    };
  });
}
