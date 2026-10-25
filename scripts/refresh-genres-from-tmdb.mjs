import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const csvPath = resolve(root, 'movies.csv');
const envPath = resolve(root, '.env');
const applyChanges = process.argv.includes('--apply');
const syncDatabase = process.argv.includes('--sync-db');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeTitle(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeGenre(value) {
  const compact = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['kdrama', 'koreandrama', 'koreanseries', 'koreantv', 'southkoreandrama', 'southkoreanseries', 'southkoreantv'].includes(compact)) return 'K-Drama';
  if (compact === 'anime') return 'Anime';
  return value.trim();
}

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value || value.startsWith('#')) return [];
    const split = value.indexOf('=');
    if (split < 0) return [];
    const key = value.slice(0, split).trim();
    let contents = value.slice(split + 1).trim();
    if ((contents.startsWith('"') && contents.endsWith('"')) || (contents.startsWith("'") && contents.endsWith("'"))) contents = contents.slice(1, -1);
    return [[key, contents]];
  }));
}

const env = parseEnv(await readFile(envPath, 'utf8'));
const apiKey = env.VITE_TMDB_API_KEY;
if (!apiKey) throw new Error('VITE_TMDB_API_KEY is missing from .env. No files were changed.');
if (syncDatabase && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
  throw new Error('Supabase is not configured in .env. Use --apply without --sync-db to update only the CSV.');
}

async function requestJson(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryAfter ? retryAfter * 1000 : 350 * (2 ** attempt)));
      continue;
    }
    throw new Error(`TMDB returned HTTP ${response.status}. No credentials or request URLs were logged.`);
  }
  throw new Error('TMDB request failed after retries.');
}

const api = (path) => `https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}&language=en-US`;
const [movieGenreData, tvGenreData] = await Promise.all([
  requestJson(api('/genre/movie/list')),
  requestJson(api('/genre/tv/list')),
]);
const genreMaps = {
  Movie: new Map(movieGenreData.genres.map(({ id, name }) => [id, name])),
  'TV Series': new Map(tvGenreData.genres.map(({ id, name }) => [id, name])),
};

const rows = parseCsv(await readFile(csvPath, 'utf8'));
if (rows.length < 2) throw new Error('movies.csv has no title rows. No files were changed.');
const headers = rows[0].map((header) => header.trim().toLowerCase());
const titleColumn = headers.indexOf('title');
const typeColumn = headers.indexOf('type');
const genreColumn = headers.indexOf('genre');
const yearColumn = headers.findIndex((header) => ['year', 'release year', 'release_year'].includes(header));
if ([titleColumn, typeColumn, genreColumn].some((index) => index < 0)) throw new Error('movies.csv must include Title, Type, and Genre columns.');

const updates = new Array(rows.length - 1);
let nextIndex = 0;
let failedRequests = 0;
const worker = async () => {
  while (true) {
    const index = nextIndex++;
    if (index >= rows.length - 1) return;
    const row = rows[index + 1];
    const title = row[titleColumn]?.trim();
    const type = /series|tv/i.test(row[typeColumn] ?? '') ? 'TV Series' : 'Movie';
    const year = yearColumn >= 0 ? Number.parseInt(row[yearColumn], 10) || undefined : undefined;
    const mediaType = type === 'TV Series' ? 'tv' : 'movie';
    const oldGenres = (row[genreColumn] ?? '').split(/[|;/]/).map(normalizeGenre).filter(Boolean);
    try {
      const results = await requestJson(api(`/search/${mediaType}?query=${encodeURIComponent(title)}`));
      const normalized = normalizeTitle(title);
      const candidates = (results.results ?? []).filter((result) => {
        const displayName = result.title || result.name || '';
        const originalName = result.original_title || result.original_name || '';
        return normalizeTitle(displayName) === normalized || normalizeTitle(originalName) === normalized;
      });
      if (!candidates.length) {
        updates[index] = { row, title, type, oldGenres, newGenres: oldGenres, matched: false };
        continue;
      }
      const preserve = oldGenres.filter((genre) => ['anime', 'k-drama'].includes(genre.toLowerCase()));
      const yearMatched = year ? candidates.filter((result) => {
        const date = result.release_date || result.first_air_date || '';
        return Number.parseInt(date.slice(0, 4), 10) === year;
      }) : [];
      const yearCandidates = yearMatched.length ? yearMatched : candidates;
      const preferred = yearCandidates.find((result) => oldGenres.some((genre) => genre.toLowerCase() === 'k-drama') && result.original_language === 'ko')
        ?? yearCandidates.find((result) => oldGenres.some((genre) => genre.toLowerCase() === 'anime') && result.original_language === 'ja')
        ?? yearCandidates[0];
      const tmdbGenres = [...new Set((preferred.genre_ids ?? []).map((id) => genreMaps[type].get(id)).filter(Boolean))];
      const newGenres = [...new Set([...tmdbGenres, ...preserve])];
      updates[index] = { row, title, type, oldGenres, newGenres, matched: true };
    } catch (error) {
      failedRequests += 1;
      updates[index] = { row, title, type, oldGenres, newGenres: oldGenres, matched: false, error: error.message };
    }
  }
};

await Promise.all(Array.from({ length: 4 }, worker));
const matched = updates.filter((item) => item.matched);
const unmatched = updates.filter((item) => !item.matched);
const changed = matched.filter((item) => item.oldGenres.join('|') !== item.newGenres.join('|'));
console.log(`TMDB exact matches: ${matched.length}/${updates.length}`);
console.log(`Genre sets changed: ${changed.length}; unchanged: ${matched.length - changed.length}`);
console.log(`Unmatched or failed requests: ${unmatched.length}; request failures: ${failedRequests}`);
for (const item of changed.slice(0, 30)) console.log(`${item.title} (${item.type}): ${item.oldGenres.join(', ') || '(none)'} -> ${item.newGenres.join(', ') || '(none)'}`);
if (unmatched.length) console.log(`Unmatched sample: ${unmatched.slice(0, 15).map(({ title }) => title).join(', ')}`);
if (!applyChanges) {
  console.log('Preview only. Re-run with --apply --sync-db to back up and update the CSV and matching Supabase rows.');
  process.exit(0);
}
if (failedRequests) throw new Error('Some TMDB requests failed; refusing a partial CSV/DB update. No files were changed.');

const backupPath = resolve(root, 'archive', `movies.csv.before-tmdb-${new Date().toISOString().slice(0, 10)}.bak`);
await mkdir(dirname(backupPath), { recursive: true });
await copyFile(csvPath, backupPath);
for (const item of matched) item.row[genreColumn] = item.newGenres.join(' / ');
const output = [rows[0], ...updates.map((item) => item.row)].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
await writeFile(csvPath, output, 'utf8');
console.log(`Updated movies.csv; backup saved at ${backupPath}.`);

if (syncDatabase) {
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  const { data: dbRows, error: readError } = await supabase.from('movies').select('id,title,type');
  if (readError) throw new Error(`CSV was updated, but Supabase could not be read: ${readError.message}`);
  const keyFor = (title, type) => `${type}:${normalizeTitle(title)}`;
  const dbByKey = new Map();
  for (const item of dbRows ?? []) {
    const key = keyFor(item.title, item.type);
    dbByKey.set(key, [...(dbByKey.get(key) ?? []), item]);
  }
  let dbUpdated = 0;
  let dbMissing = 0;
  const dbErrors = [];
  for (const item of matched) {
    const targets = dbByKey.get(keyFor(item.title, item.type)) ?? [];
    if (!targets.length) { dbMissing += 1; continue; }
    for (const target of targets) {
      const { error } = await supabase.from('movies').update({ genres: item.newGenres }).eq('id', target.id);
      if (error) dbErrors.push(`${item.title}: ${error.message}`);
      else dbUpdated += 1;
    }
  }
  console.log(`Supabase rows updated: ${dbUpdated}; CSV titles not found in Supabase: ${dbMissing}; DB update errors: ${dbErrors.length}.`);
  for (const message of dbErrors.slice(0, 10)) console.log(message);
}
