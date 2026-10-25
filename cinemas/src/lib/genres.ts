export const GENRES = [
  'Horror',
  'Psychological Thriller',
  'Mystery',
  'Crime',
  'Romance',
  'Drama',
  'Sci-Fi',
  'Fantasy',
  'Adventure',
  'Comedy',
  'Animation',
  'Anime',
  'Superhero',
  'Thriller',
  'Action',
  'Spy',
  'Historical Drama',
  'K-Drama',
  'Supernatural',
  'Space',
] as const;

export type Genre = (typeof GENRES)[number];

const TMDB_GENRE_ID_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'Historical Drama',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'Drama',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi',
  10766: 'Drama',
  10767: 'Talk',
  10768: 'War',
};

const TMDB_GENRE_NAME_ALIASES: Record<string, string> = {
  'Science Fiction': 'Sci-Fi',
  'Sci-Fi & Fantasy': 'Sci-Fi',
  'Action & Adventure': 'Action',
  History: 'Historical Drama',
  'TV Movie': 'Drama',
};

export function mapTmdbGenreIds(ids: number[] | undefined): string[] {
  if (!ids?.length) return [];
  return uniqueGenres(ids.map((id) => TMDB_GENRE_ID_MAP[id]).filter(Boolean));
}

export function mapTmdbGenreNames(
  genres: Array<{ id: number; name: string }> | undefined
): string[] {
  if (!genres?.length) return [];
  return uniqueGenres(
    genres.map((genre) => TMDB_GENRE_NAME_ALIASES[genre.name] || genre.name)
  );
}

export function uniqueGenres(genres: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const genre of genres) {
    const name = genre.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
