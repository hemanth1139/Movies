import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value || value.startsWith('#')) return [];
    const separator = value.indexOf('=');
    if (separator < 0) return [];
    const key = value.slice(0, separator).trim();
    let contents = value.slice(separator + 1).trim();
    if ((contents.startsWith('"') && contents.endsWith('"')) || (contents.startsWith("'") && contents.endsWith("'"))) contents = contents.slice(1, -1);
    return [[key, contents]];
  }));
}

const env = parseEnv(await readFile(new URL('../.env', import.meta.url), 'utf8'));
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TMDB_API_KEY } = env;
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) throw new Error('Supabase URL or anon key is missing from .env.');
if (!VITE_TMDB_API_KEY) throw new Error('TMDB API key is missing from .env.');

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
const { data: rows, error } = await supabase.from('movies').select('id,title,type,release_year,tmdb_id,poster_path').order('title');
if (error) throw new Error(`Could not read movies from Supabase: ${error.message}`);

const missing = (rows ?? []).filter((movie) => !movie.poster_path);
console.log(`Library: ${rows?.length ?? 0} titles; missing poster path: ${missing.length}.`);
for (const movie of missing) console.log(`Missing: ${movie.title} (${movie.type}, ${movie.release_year ?? 'year unknown'}, TMDB ID ${movie.tmdb_id ?? 'missing'})`);
if (process.argv.includes('--check-images')) {
  const withPosters = (rows ?? []).filter((movie) => movie.poster_path);
  let next = 0;
  let checked = 0;
  const broken = [];
  const worker = async () => {
    while (next < withPosters.length) {
      const movie = withPosters[next++];
      try {
        const response = await fetch(`https://image.tmdb.org/t/p/w185${movie.poster_path}`, { method: 'HEAD', signal: AbortSignal.timeout(12000) });
        checked += 1;
        if (!response.ok) broken.push({ title: movie.title, year: movie.release_year, status: response.status, path: movie.poster_path });
      } catch (cause) {
        checked += 1;
        broken.push({ title: movie.title, year: movie.release_year, status: cause instanceof Error ? cause.message : String(cause), path: movie.poster_path });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, withPosters.length) }, () => worker()));
  console.log(`Poster URLs checked: ${checked}; unavailable: ${broken.length}.`);
  for (const item of broken) console.log(JSON.stringify(item));
}
if (missing.length && !process.argv.includes('--list-only') && !process.argv.includes('--check-images')) {

const apiBase = 'https://api.themoviedb.org/3';
const normalize = (value = '') => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const yearOf = (date) => date ? Number(date.slice(0, 4)) : undefined;

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`TMDB returned HTTP ${response.status}`);
  return response.json();
}

async function inspect(movie) {
  const type = movie.type === 'TV Series' ? 'tv' : 'movie';
  const searchParams = new URLSearchParams({ api_key: VITE_TMDB_API_KEY, query: movie.title, language: 'en-US' });
  if (movie.release_year && type === 'movie') searchParams.set('year', String(movie.release_year));
  if (movie.release_year && type === 'tv') searchParams.set('first_air_date_year', String(movie.release_year));
  const search = await request(`${apiBase}/search/${type}?${searchParams}`);
  const exactTitle = (search.results ?? []).filter((candidate) => [candidate.title, candidate.name, candidate.original_title, candidate.original_name]
    .some((label) => normalize(label) === normalize(movie.title)));
  let exact = movie.release_year
    ? exactTitle.find((candidate) => yearOf(candidate.release_date || candidate.first_air_date) === movie.release_year)
    : exactTitle[0];
  if (!exact && movie.release_year) {
    const fallbackParams = new URLSearchParams({ api_key: VITE_TMDB_API_KEY, query: movie.title, language: 'en-US' });
    const fallback = await request(`${apiBase}/search/${type}?${fallbackParams}`);
    const fallbackTitles = (fallback.results ?? []).filter((candidate) => [candidate.title, candidate.name, candidate.original_title, candidate.original_name]
      .some((label) => normalize(label) === normalize(movie.title)));
    exact = fallbackTitles.find((candidate) => yearOf(candidate.release_date || candidate.first_air_date) === movie.release_year)
      ?? (fallbackTitles.length === 1 ? fallbackTitles[0] : undefined);
  }
  const similar = (search.results ?? []).slice(0, 3).map((candidate) => `${candidate.title || candidate.name} (${yearOf(candidate.release_date || candidate.first_air_date) || 'year unknown'})`);
  if (!exact) return { movie, status: 'No exact title/year match', candidates: similar };

  const imageParams = new URLSearchParams({ api_key: VITE_TMDB_API_KEY });
  const images = await request(`${apiBase}/${type}/${exact.id}/images?${imageParams}`);
  const posters = images.posters ?? [];
  posters.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0) || (b.vote_average ?? 0) - (a.vote_average ?? 0));
  return { movie, match: `${exact.title || exact.name} (${yearOf(exact.release_date || exact.first_air_date) || 'year unknown'})`, tmdbId: exact.id, posterPath: posters[0]?.file_path, status: posters.length ? 'Poster found' : 'Exact title/year matched; no posters available' };
}

let failures = 0;
for (const movie of missing) {
  try {
    const result = await inspect(movie);
    console.log(JSON.stringify({ title: movie.title, type: movie.type, year: movie.release_year, currentTmdbId: movie.tmdb_id, ...result }));
    failures = 0;
  } catch (cause) {
    failures += 1;
    console.log(JSON.stringify({ title: movie.title, type: movie.type, year: movie.release_year, status: 'TMDB request failed', error: cause instanceof Error ? cause.message : String(cause) }));
    if (failures >= 3) {
      console.log('Stopped after 3 consecutive TMDB request failures.');
      break;
    }
  }
}
}
