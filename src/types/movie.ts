export type MediaType = 'Movie' | 'TV Series';

export interface Movie {
  id: string;
  title: string;
  type: MediaType;
  genres: string[];
  franchise?: string | null;
  universe?: string;
  universeOrder?: number;
  release_year?: number;
  tmdb_id?: number;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  original_language?: string;
  origin_country?: string[];
  release_date?: string;
  runtime?: number;
  total_seasons?: number;
  /** Optional UI metadata; populated when season details are added later. */
  season_episode_counts?: number[];
  created_at: string;
  updated_at: string;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  original_language?: string;
  origin_country?: string[];
  media_type?: 'movie' | 'tv' | 'person';
  genre_ids?: number[];
}

export interface TMDBMovieDetails {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  original_language?: string;
  origin_country?: string[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: Array<{
    id?: number;
    name?: string;
    season_number: number;
    episode_count: number;
    air_date?: string | null;
    poster_path?: string | null;
  }>;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string }>;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string;
  };
}
