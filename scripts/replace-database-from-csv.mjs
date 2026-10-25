import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();

function parseCsv(text) {
  const rows = [];
  let row = [];
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
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value || value.startsWith('#')) return [];
    const separator = value.indexOf('=');
    if (separator < 0) return [];
    const key = value.slice(0, separator).trim();
    let contents = value.slice(separator + 1).trim();
    if ((contents.startsWith('"') && contents.endsWith('"')) || (contents.startsWith("'") && contents.endsWith("'"))) {
      contents = contents.slice(1, -1);
    }
    return [[key, contents]];
  }));
}

function normalizeGenre(value) {
  const genre = value.trim();
  const compact = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['kdrama', 'koreandrama', 'koreanseries', 'koreantv', 'southkoreandrama', 'southkoreanseries', 'southkoreantv'].includes(compact)) return 'K-Drama';
  if (compact === 'anime') return 'Anime';
  return genre;
}

const [csvText, envText] = await Promise.all([
  readFile(resolve(root, 'movies.csv'), 'utf8'),
  readFile(resolve(root, '.env'), 'utf8'),
]);
const env = parseEnv(envText);
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env. No database changes were made.');
}

const rows = parseCsv(csvText);
if (rows.length < 2) throw new Error('movies.csv contains no title rows. No database changes were made.');
const headers = rows[0].map((header) => header.toLowerCase().trim());
const column = (...names) => headers.findIndex((header) => names.includes(header));
const titleColumn = column('title');
const typeColumn = column('type');
const genreColumn = column('genre');
const yearColumn = column('year', 'release year', 'release_year');
if ([titleColumn, typeColumn, genreColumn].some((index) => index < 0)) {
  throw new Error('movies.csv needs Title, Type, and Genre columns. No database changes were made.');
}

const movies = rows.slice(1).map((row, index) => {
  const title = row[titleColumn]?.trim();
  const rawType = row[typeColumn]?.trim() ?? '';
  const rawGenres = row[genreColumn] ?? '';
  if (!title || !rawType || !rawGenres.trim()) {
    throw new Error(`CSV row ${index + 2} is missing Title, Type, or Genre. No database changes were made.`);
  }
  const type = /series|tv/i.test(rawType) ? 'TV Series' : 'Movie';
  const genres = [...new Set(rawGenres.split(/[,|;/]/).map(normalizeGenre).filter(Boolean))];
  const year = yearColumn < 0 ? undefined : Number.parseInt(row[yearColumn] ?? '', 10);
  return {
    title,
    type,
    genres,
    ...(Number.isFinite(year) && year > 0 ? { release_year: year } : {}),
  };
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Read all current rows first, then keep a local recovery copy before mutating the table.
const existing = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase.from('movies').select('*').order('id').range(offset, offset + 999);
  if (error) throw new Error(`Could not read the current database; nothing was deleted. ${error.message}`);
  existing.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}

const backupDir = resolve(root, 'archive');
await mkdir(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(':', '-');
const backupPath = resolve(backupDir, `database-before-csv-replace-${timestamp}.json`);
await writeFile(backupPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');

const { error: deleteError } = await supabase.from('movies').delete().not('id', 'is', null);
if (deleteError) throw new Error(`Could not delete existing rows. No replacement was inserted. Recovery copy: ${backupPath}. ${deleteError.message}`);

for (let offset = 0; offset < movies.length; offset += 100) {
  const batch = movies.slice(offset, offset + 100);
  const { error } = await supabase.from('movies').insert(batch);
  if (error) {
    throw new Error(`Database deletion succeeded, but insertion stopped at CSV row ${offset + 1}. Recovery copy: ${backupPath}. ${error.message}`);
  }
}

const { count, error: countError } = await supabase.from('movies').select('id', { count: 'exact', head: true });
if (countError) throw new Error(`CSV rows inserted, but the final count could not be confirmed. Recovery copy: ${backupPath}. ${countError.message}`);

console.log(`Replaced database records from movies.csv: ${existing.length} backed up, ${movies.length} inserted, ${count} confirmed.`);
console.log(`Recovery copy saved at ${backupPath}`);
