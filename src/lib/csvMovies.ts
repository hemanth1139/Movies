import csvText from '../../movies.csv?raw';
import type { MediaType, Movie } from '../types/movie';
import { uniqueGenres } from './genres';

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) records.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) records.push(row);
  return records;
}

const records = parseCsvRecords(csvText);
const headers = (records.shift() ?? []).map((header) => header.toLowerCase().trim());
const column = (name: string) => headers.indexOf(name.toLowerCase());
const titleColumn = column('title');
const typeColumn = column('type');
const genreColumn = column('genre');
const yearColumn = headers.findIndex((header) => ['year', 'release year', 'release_year'].includes(header));
const serialColumn = column('serial number');
const now = new Date().toISOString();

export const csvMovies: Movie[] = records.flatMap((record, index) => {
  const title = record[titleColumn]?.trim();
  if (!title) return [];

  const rawType = record[typeColumn]?.toLowerCase() ?? '';
  const type: MediaType = rawType.includes('series') || rawType.includes('tv') ? 'TV Series' : 'Movie';
  // The current CSV stores genres as comma-separated values inside a quoted cell.
  const genres = uniqueGenres((record[genreColumn] ?? '').split(/[,|;/]/));
  const serial = record[serialColumn]?.trim() || String(index + 1);
  const parsedYear = yearColumn < 0 ? undefined : Number.parseInt(record[yearColumn] ?? '', 10);

  return [{
    id: `csv-${serial}`,
    title,
    type,
    genres,
    ...(parsedYear && Number.isFinite(parsedYear) ? { release_year: parsedYear } : {}),
    created_at: now,
    updated_at: now,
  }];
});

export function normalizeMovieKey(title: string, type: MediaType): string {
  return `${type}:${title.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')}`;
}
