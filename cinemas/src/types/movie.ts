export type MediaType = 'Movie' | 'TV Series';

export interface Movie {
  id: string;
  title: string;
  type: MediaType;
  genres: string[];
  franchise?: string;
  release_year?: number;
  tmdb_id?: number;
  poster_path?: string;
  created_at: string;
  updated_at: string;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  overview?: string;
  media_type?: 'movie' | 'tv';
}

export interface TMDBMovieDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string;
  };
}
