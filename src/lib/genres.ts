export const GENRES = [
  'Action',
  'Action & Adventure',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Kids',
  'Music',
  'Mystery',
  'News',
  'Reality',
  'Romance',
  'Sci-Fi & Fantasy',
  'Science Fiction',
  'Soap',
  'Talk',
  'TV Movie',
  'Thriller',
  'War',
  'War & Politics',
  'Western',
  'Anime',
  'K-Drama',
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
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export function mapTmdbGenreIds(ids: number[] | undefined): string[] {
  if (!ids?.length) return [];
  return uniqueGenres(ids.map((id) => TMDB_GENRE_ID_MAP[id]).filter(Boolean));
}

export function mapTmdbGenreNames(
  genres: Array<{ id: number; name: string }> | undefined
): string[] {
  if (!genres?.length) return [];
  return uniqueGenres(genres.map((genre) => genre.name));
}

export function uniqueGenres(genres: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const genre of genres) {
    const name = normalizeGenreName(genre);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function normalizeGenreName(genre: string): string {
  const name = genre.trim();
  const compact = name.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
  if (['kdrama', 'koreandrama', 'koreanseries', 'koreantv', 'southkoreandrama', 'southkoreanseries', 'southkoreantv'].includes(compact)) {
    return 'K-Drama';
  }
  return name;
}
