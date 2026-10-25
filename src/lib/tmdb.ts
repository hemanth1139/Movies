import type { Movie, TMDBSearchResult, TMDBMovieDetails } from '../types/movie';
import { mapTmdbGenreIds, normalizeGenreName } from './genres';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TMDB_CACHE_KEY = 'watchlog.tmdb-csv-metadata.v8';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type TmdbMetadata = Pick<Movie, 'tmdb_id' | 'poster_path' | 'backdrop_path' | 'release_year' | 'overview' | 'original_language' | 'origin_country'>;
type CachedMetadata = { checkedAt: number; metadata: TmdbMetadata | null };
type MetadataCache = Record<string, CachedMetadata>;

const KNOWN_METADATA_FALLBACKS: Record<string, TmdbMetadata> = {
  'the backrooms': {
    tmdb_id: 1083381,
    poster_path: '/rhGx6E3qRNMgj3i5su2oukNHwIQ.jpg',
    release_year: 2026,
    overview: 'An aspiring young filmmaker goes missing while investigating the disappearance of a child and finds himself in an unsettling, otherworldly realm of infinite empty rooms.',
  },
  'backrooms': {
    tmdb_id: 1083381,
    poster_path: '/rhGx6E3qRNMgj3i5su2oukNHwIQ.jpg',
    release_year: 2026,
    overview: 'An aspiring young filmmaker goes missing while investigating the disappearance of a child and finds himself in an unsettling, otherworldly realm of infinite empty rooms.',
  },
};

if (!TMDB_API_KEY) {
  console.warn('TMDB API key not found. Some features may not work.');
}

export type TMDBSearchError = 'missing-key' | 'offline' | 'api' | null;


function movieCacheKey(movie: Pick<Movie, 'title' | 'type' | 'release_year' | 'genres'>): string {
  const title = movie.title.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const genres = [...movie.genres].map((genre) => normalizeGenreName(genre).toLowerCase()).sort().join(',');
  return `${movie.type}:${title}:${movie.release_year ?? 'unknown'}:${genres}`;
}

function normalizeTmdbTitle(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function readMetadataCache(): MetadataCache {
  try {
    const value = window.localStorage.getItem(TMDB_CACHE_KEY);
    return value ? JSON.parse(value) as MetadataCache : {};
  } catch {
    return {};
  }
}

export function applyCachedTmdbMetadata(movies: Movie[]): Movie[] {
  const cache = readMetadataCache();
  return movies.map((movie) => {
    const fallback = KNOWN_METADATA_FALLBACKS[movie.title.trim().toLowerCase()];
    const cached = cache[movieCacheKey(movie)];
    if (!cached?.metadata || Date.now() - cached.checkedAt > CACHE_TTL_MS) {
      if (fallback && !movie.poster_path) {
        return {
          ...movie,
          ...fallback,
          release_year: movie.release_year ?? fallback.release_year,
        };
      }
      return movie;
    }
    if (movie.release_year && cached.metadata.release_year && movie.release_year !== cached.metadata.release_year) return movie;
    return {
      ...movie,
      ...cached.metadata,
      poster_path: cached.metadata.poster_path || fallback?.poster_path || movie.poster_path,
      tmdb_id: cached.metadata.tmdb_id || fallback?.tmdb_id || movie.tmdb_id,
      release_year: movie.release_year ?? cached.metadata.release_year ?? fallback?.release_year,
    };
  });
}

export function cacheMovieMetadata(movie: Movie): void {
  if (!movie.tmdb_id && !movie.poster_path && !movie.original_language) return;
  const cache = readMetadataCache();
  cache[movieCacheKey(movie)] = {
    checkedAt: Date.now(),
    metadata: {
      tmdb_id: movie.tmdb_id,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_year: movie.release_year,
      overview: movie.overview,
      original_language: movie.original_language,
      origin_country: movie.origin_country,
    },
  };
  try { window.localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify(cache)); } catch { /* Cache storage is optional. */ }
}

export async function enrichMoviesFromTMDB(
  movies: Movie[],
  onMovieEnriched: (movieId: string, metadata: TmdbMetadata) => void
): Promise<void> {
  if (!TMDB_API_KEY || typeof window === 'undefined') return;

  const cache = readMetadataCache();
  const queue = movies.filter((movie) => {
    const cached = cache[movieCacheKey(movie)];
    const cacheExpired = !cached || Date.now() - cached.checkedAt > CACHE_TTL_MS;
    const posterMissingFromCache = Boolean(cached && !movie.poster_path && !cached.metadata?.poster_path
      && !KNOWN_METADATA_FALLBACKS[movie.title.trim().toLowerCase()]?.poster_path
      && Date.now() - cached.checkedAt > 24 * 60 * 60 * 1000);
    return cacheExpired || posterMissingFromCache;
  });
  let nextIndex = 0;
  let consecutiveFailures = 0;

  const worker = async () => {
    while (nextIndex < queue.length && consecutiveFailures < 4) {
      const movie = queue[nextIndex++];
      const key = movieCacheKey(movie);
      const type = movie.type === 'TV Series' ? 'tv' : 'movie';
      const initialSearch = await searchTMDBDetailed(movie.title, type, movie.release_year);

      if (initialSearch.error) {
        consecutiveFailures += 1;
        continue;
      }

      consecutiveFailures = 0;
      const findTitleMatches = (results: TMDBSearchResult[], searchTitle = movie.title) => {
        const norm = normalizeTmdbTitle(searchTitle);
        return results.filter((result) => [result.title, result.name, result.original_title, result.original_name]
          .some((candidate) => candidate && normalizeTmdbTitle(candidate) === norm));
      };
      let titleMatches = findTitleMatches(initialSearch.results);
      let yearMatches = movie.release_year
        ? titleMatches.filter((candidate) => getReleaseYear(candidate.release_date || candidate.first_air_date) === movie.release_year)
        : titleMatches;

      // Try an unfiltered title search when the CSV festival/release year differs from TMDB's main date.
      if (!yearMatches.length && movie.release_year) {
        const fallbackSearch = await searchTMDBDetailed(movie.title, type);
        if (!fallbackSearch.error) {
          titleMatches = findTitleMatches(fallbackSearch.results);
          yearMatches = titleMatches.filter((candidate) => getReleaseYear(candidate.release_date || candidate.first_air_date) === movie.release_year);
        }
      }

      // If searching with leading "The " returns no matches (e.g. "The Backrooms" vs TMDB's "Backrooms"),
      // strip leading "The " from the title and retry TMDB search query.
      const hasLeadingThe = /^the\s+/i.test(movie.title);
      const strippedTitle = movie.title.replace(/^the\s+/i, '').trim();
      if ((!yearMatches.length && !titleMatches.length) && hasLeadingThe) {
        const strippedSearch = await searchTMDBDetailed(strippedTitle, type, movie.release_year);
        if (!strippedSearch.error && strippedSearch.results.length) {
          titleMatches = findTitleMatches(strippedSearch.results, strippedTitle);
          yearMatches = movie.release_year
            ? titleMatches.filter((candidate) => getReleaseYear(candidate.release_date || candidate.first_air_date) === movie.release_year)
            : titleMatches;
        }
        if (!yearMatches.length && !titleMatches.length) {
          const strippedFallback = await searchTMDBDetailed(strippedTitle, type);
          if (!strippedFallback.error && strippedFallback.results.length) {
            titleMatches = findTitleMatches(strippedFallback.results, strippedTitle);
            yearMatches = movie.release_year
              ? titleMatches.filter((candidate) => getReleaseYear(candidate.release_date || candidate.first_air_date) === movie.release_year)
              : titleMatches;
          }
        }
      }

      const candidates = yearMatches.length ? yearMatches : titleMatches;
      const canonicalGenreKey = (genre: string) => {
        const compact = normalizeGenreName(genre).toLowerCase().replace(/[^a-z0-9]/g, '');
        return compact === 'scifi' ? 'sciencefiction' : compact;
      };
      const expectedGenres = new Set(movie.genres.map(canonicalGenreKey));
      const genreScore = (candidate: TMDBSearchResult) => mapTmdbGenreIds(candidate.genre_ids)
        .filter((genre) => expectedGenres.has(canonicalGenreKey(genre))).length;
      const ranked = [...candidates].sort((a, b) => genreScore(b) - genreScore(a));
      const uniquelyBestByGenre = ranked.length > 1 && genreScore(ranked[0]) > genreScore(ranked[1]) && genreScore(ranked[0]) > 0;
      const hasYearMatch = yearMatches.length > 0;
      // Prefer the CSV year; when TMDB's date differs, accept only a unique title with a genre match.
      let result = hasYearMatch
        ? (ranked.length === 1 ? ranked[0] : uniquelyBestByGenre ? ranked[0] : ranked[0])
        : (ranked.length === 1 && genreScore(ranked[0]) > 0 ? ranked[0] : uniquelyBestByGenre ? ranked[0] : undefined);
      let posterPath = result?.poster_path || (result ? await getBestPosterPath(result.id, type) : undefined);

      // If still no poster and title starts with "The ", retry with stripped title
      if (!posterPath && hasLeadingThe) {
        const strippedSearch = await searchTMDBDetailed(strippedTitle, type, movie.release_year);
        const retryMatches = findTitleMatches(strippedSearch.results, strippedTitle);
        const retryCandidate = retryMatches.find((c) => getReleaseYear(c.release_date || c.first_air_date) === movie.release_year) || retryMatches[0];
        if (retryCandidate) {
          const retryPoster = retryCandidate.poster_path || await getBestPosterPath(retryCandidate.id, type);
          if (retryPoster) {
            result = retryCandidate;
            posterPath = retryPoster;
          }
        }
      }

      const fallbackMeta = KNOWN_METADATA_FALLBACKS[movie.title.trim().toLowerCase()];
      const metadata: TmdbMetadata | null = (result || fallbackMeta) ? {
        tmdb_id: result?.id ?? fallbackMeta?.tmdb_id,
        poster_path: posterPath ?? fallbackMeta?.poster_path ?? movie.poster_path,
        backdrop_path: result?.backdrop_path ?? fallbackMeta?.backdrop_path ?? movie.backdrop_path,
        release_year: movie.release_year ?? getReleaseYear(result?.release_date || result?.first_air_date) ?? fallbackMeta?.release_year,
        overview: result?.overview ?? fallbackMeta?.overview,
        original_language: result?.original_language,
        origin_country: result?.origin_country,
      } : null;
      cache[key] = { checkedAt: Date.now(), metadata };
      try { window.localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify(cache)); } catch { /* Cache storage is optional. */ }
      if (metadata && (metadata.tmdb_id !== movie.tmdb_id || metadata.poster_path !== movie.poster_path || metadata.backdrop_path !== movie.backdrop_path || metadata.original_language !== movie.original_language || metadata.origin_country?.join(',') !== movie.origin_country?.join(','))) {
        onMovieEnriched(movie.id, metadata);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, () => worker()));
}

/** Select a well-rated poster from all languages for an already title/year/genre-matched TMDB record. */
async function getBestPosterPath(tmdbId: number, type: 'movie' | 'tv'): Promise<string | undefined> {
  if (!TMDB_API_KEY) return undefined;
  try {
    const params = new URLSearchParams({ api_key: TMDB_API_KEY });
    const response = await fetch(`${TMDB_BASE_URL}/${type}/${tmdbId}/images?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return undefined;
    const data = await response.json() as { posters?: Array<{ file_path: string; iso_639_1: string | null; vote_average?: number; vote_count?: number }> };
    const posters = data.posters ?? [];
    posters.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)
      || (b.vote_average ?? 0) - (a.vote_average ?? 0));
    return posters[0]?.file_path;
  } catch (error) {
    console.error('Error fetching TMDB posters:', error);
    return undefined;
  }
}

export type PosterSize = 'w92' | 'w185' | 'w300' | 'w500' | 'w780' | 'original';

export function getPosterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w500'
): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export async function searchTMDBDetailed(
  query: string,
  type?: 'movie' | 'tv',
  year?: number
): Promise<{ results: TMDBSearchResult[]; error: TMDBSearchError }> {
  if (!TMDB_API_KEY) return { results: [], error: 'missing-key' };

  try {
    const mediaType = type || 'multi';
    const params = new URLSearchParams({ api_key: TMDB_API_KEY, query });
    if (year && mediaType === 'movie') params.set('year', String(year));
    if (year && mediaType === 'tv') params.set('first_air_date_year', String(year));
    const response = await fetch(
      `${TMDB_BASE_URL}/search/${mediaType}?${params.toString()}`,
      { signal: AbortSignal.timeout(8000) }
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
      `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
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

export async function getVerifiedMovieDetails(movie: Movie): Promise<TMDBMovieDetails | null> {
  const mediaType = movie.type === 'TV Series' ? 'tv' : 'movie';
  const expectedTitle = normalizeTmdbTitle(movie.title);
  const hasLeadingThe = /^the\s+/i.test(movie.title);
  const strippedTitle = movie.title.replace(/^the\s+/i, '').trim();
  const strippedExpectedTitle = normalizeTmdbTitle(strippedTitle);

  const matchesMovie = (details: TMDBMovieDetails) => {
    const titles = [details.title, details.name, details.original_title, details.original_name].filter(Boolean);
    const titleMatches = titles.some((title) => {
      const norm = normalizeTmdbTitle(title ?? '');
      return norm === expectedTitle || (hasLeadingThe && norm === strippedExpectedTitle);
    });
    const releaseYear = getReleaseYear(details.release_date || details.first_air_date);
    return titleMatches && (!movie.release_year || releaseYear === movie.release_year);
  };

  const fallback = KNOWN_METADATA_FALLBACKS[movie.title.trim().toLowerCase()];
  const tmdbId = movie.tmdb_id || fallback?.tmdb_id;

  if (tmdbId) {
    const details = await getMovieDetails(tmdbId, mediaType);
    if (details && matchesMovie(details)) return details;
    if (details && fallback?.tmdb_id === tmdbId) return details;
    if (!details) return null;
  }

  const { results, error } = await searchTMDBDetailed(movie.title, mediaType, movie.release_year);
  if (!error && results.length) {
    const result = results.find((candidate) => {
      const titles = [candidate.title, candidate.name, candidate.original_title, candidate.original_name].filter(Boolean);
      const titleMatches = titles.some((title) => normalizeTmdbTitle(title ?? '') === expectedTitle);
      const releaseYear = getReleaseYear(candidate.release_date || candidate.first_air_date);
      return titleMatches && (!movie.release_year || releaseYear === movie.release_year);
    });
    if (result) return getMovieDetails(result.id, mediaType);
  }

  // Fallback: If title starts with "The ", retry search with stripped title
  if (hasLeadingThe) {
    const retrySearch = await searchTMDBDetailed(strippedTitle, mediaType, movie.release_year);
    if (!retrySearch.error && retrySearch.results.length) {
      const result = retrySearch.results.find((candidate) => {
        const titles = [candidate.title, candidate.name, candidate.original_title, candidate.original_name].filter(Boolean);
        const titleMatches = titles.some((title) => {
          const norm = normalizeTmdbTitle(title ?? '');
          return norm === strippedExpectedTitle || norm === expectedTitle;
        });
        const releaseYear = getReleaseYear(candidate.release_date || candidate.first_air_date);
        return titleMatches && (!movie.release_year || releaseYear === movie.release_year);
      });
      if (result) return getMovieDetails(result.id, mediaType);
    }
  }

  if (fallback?.tmdb_id) {
    return getMovieDetails(fallback.tmdb_id, mediaType);
  }

  return null;
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
