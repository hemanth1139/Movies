import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { Movie } from '../types/movie';
import type { WatchLogMap } from '../types/watchLog';
import { isAnimeTitle } from '../lib/animeUtils';

type GroupSection = 'Movies' | 'TV Series';
interface MovieTableProps { movies: Movie[]; watchLog: WatchLogMap; onOpen: (movie: Movie) => void; searchQuery: string; onSearchChange: (query: string) => void; }
interface MovieGroup { id: string; title: string; movies: Movie[]; section?: GroupSection; }
const INITIAL_VISIBLE_ROWS = 120;
const ROWS_PER_PAGE = 120;

const kDramaTitles = new Set(['The Glory', 'The Penthouse: War in Life', 'Where Stars Land', 'Karma', 'When Life Gives You Tangerines']);
const emotionalMovieTitles = new Set(['Atonement', 'Beautiful Boy', 'Be With You', 'Call Me by Your Name', 'Dead Poets Society', 'Five Feet Apart', 'Forrest Gump', 'Gifted', 'Into the Wild', 'La La Land', 'Love, Rosie', 'Manchester by the Sea', 'Me Before You', 'Past Lives', 'The Blind Side', 'The Fault in Our Stars', 'The Notebook', 'The Perks of Being a Wallflower', 'The Pursuit of Happyness', 'The Theory of Everything', 'Whiplash']);

function getNotionCategory(movie: Movie, watchLog: WatchLogMap): { section: GroupSection; title: string } {
  const genres = movie.genres.map((genre) => genre.toLowerCase());
  const hasGenre = (...names: string[]) => genres.some((genre) => names.some((name) => genre.includes(name)));
  const animeTitle = isAnimeTitle(movie);
  const normalizedTitle = movie.title.toLowerCase();
  const universeLabel = watchLog[movie.id]?.universe || movie.universe || movie.franchise || '';
  const universe = universeLabel.toLowerCase();

  if (movie.type === 'TV Series') {
    if (animeTitle) return { section: 'TV Series', title: 'Anime TV Series' };
    if (movie.original_language === 'ko' || movie.origin_country?.includes('KR') || kDramaTitles.has(movie.title)) {
      return { section: 'TV Series', title: 'K-Drama' };
    }
    return { section: 'TV Series', title: 'International & English Series' };
  }

  if (animeTitle) return { section: 'Movies', title: 'Anime Movies' };
  if (/\bharry potter\b|\bfantastic beasts\b/.test(normalizedTitle)) return { section: 'Movies', title: 'Harry Potter Wizarding World' };
  if (universe.includes('marvel')) return { section: 'Movies', title: 'Marvel Cinematic Universe (MCU)' };
  if (universe.includes('dc')) return { section: 'Movies', title: 'DC Movies' };
  if (universe.includes('conjuring') || /^(the conjuring|annabelle|the nun|the curse of la llorona)/.test(normalizedTitle)) {
    return { section: 'Movies', title: 'The Conjuring Universe' };
  }
  if (universe.includes('disney') || universe.includes('pixar')) return { section: 'Movies', title: 'Disney & Pixar' };
  if (universe) return { section: 'Movies', title: universeLabel };
  if (hasGenre('horror', 'supernatural')) return { section: 'Movies', title: 'Horror & Supernatural' };
  if (hasGenre('romance') || emotionalMovieTitles.has(movie.title)) {
    return { section: 'Movies', title: 'Romantic, Life & Emotional' };
  }
  if (hasGenre('psychological', 'crime', 'thriller', 'mystery')) {
    return { section: 'Movies', title: 'Psychological / Crime / Thriller' };
  }
  if (hasGenre('science fiction', 'sci-fi', 'science-fiction')) {
    return { section: 'Movies', title: 'Sci-Fi / Tech / Space' };
  }
  if (hasGenre('fantasy', 'adventure', 'animation', 'family')) {
    return { section: 'Movies', title: 'Fantasy & Adventure' };
  }
  return { section: 'Movies', title: 'Miscellaneous / Fun / Drama' };
}

export default function MovieTable({ movies, watchLog, onOpen, searchQuery, onSearchChange }: MovieTableProps) {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  useEffect(() => setVisibleRows(INITIAL_VISIBLE_ROWS), [searchQuery, selectedGenre]);
  const allGenres = useMemo(() => ['All', ...new Set(movies.flatMap((movie) => movie.genres).sort((a, b) => a.localeCompare(b)))], [movies]);
  const filteredMovies = useMemo(() => movies.filter((movie) => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return (!query || `${movie.title} ${movie.genres.join(' ')}`.toLowerCase().includes(query))
      && (selectedGenre === 'All' || movie.genres.includes(selectedGenre));
  }), [movies, deferredSearchQuery, selectedGenre]);

  const groups = useMemo<MovieGroup[]>(() => {
    const franchiseCategories: Array<{ section: GroupSection; title: string }> = [
      { section: 'Movies', title: 'Marvel Cinematic Universe (MCU)' },
      { section: 'Movies', title: 'Harry Potter Wizarding World' },
      { section: 'Movies', title: 'DC Movies' },
      { section: 'Movies', title: 'The Conjuring Universe' },
      { section: 'Movies', title: 'Disney & Pixar' },
    ];
    const genreCategories: Array<{ section: GroupSection; title: string }> = [
      { section: 'Movies', title: 'Horror & Supernatural' },
      { section: 'Movies', title: 'Romantic, Life & Emotional' },
      { section: 'Movies', title: 'Psychological / Crime / Thriller' },
      { section: 'Movies', title: 'Sci-Fi / Tech / Space' },
      { section: 'Movies', title: 'Fantasy & Adventure' },
      { section: 'Movies', title: 'Miscellaneous / Fun / Drama' },
      { section: 'Movies', title: 'Anime Movies' },
      { section: 'TV Series', title: 'Anime TV Series' },
      { section: 'TV Series', title: 'K-Drama' },
      { section: 'TV Series', title: 'International & English Series' },
    ];
    const knownTitles = new Set([...franchiseCategories, ...genreCategories].map(({ section, title }) => `${section}:${title}`));
    const customUniverseCategories = [...new Set(filteredMovies.map((movie) => getNotionCategory(movie, watchLog))
      .filter((category) => category.section === 'Movies' && !knownTitles.has(`${category.section}:${category.title}`))
      .map((category) => category.title))]
      .sort((a, b) => a.localeCompare(b))
      .map((title) => ({ section: 'Movies' as const, title }));
    const orderedCategories = [...franchiseCategories, ...customUniverseCategories, ...genreCategories];
    const buckets = new Map<string, Movie[]>();
    for (const category of orderedCategories) buckets.set(`${category.section}:${category.title}`, []);
    for (const movie of filteredMovies) {
      const category = getNotionCategory(movie, watchLog);
      buckets.get(`${category.section}:${category.title}`)?.push(movie);
    }
    return orderedCategories.flatMap((category) => {
      const items = buckets.get(`${category.section}:${category.title}`) ?? [];
      return items.length ? [{ id: `notion:${category.section}:${category.title}`, ...category, movies: items.sort((a, b) => a.title.localeCompare(b.title)) }] : [];
    });
  }, [filteredMovies, watchLog]);
  const visibleGroups = useMemo(() => {
    let remaining = visibleRows;
    return groups.map((group) => {
      const visible = group.movies.slice(0, remaining);
      remaining = Math.max(0, remaining - visible.length);
      return { ...group, movies: visible };
    }).filter((group) => group.movies.length > 0);
  }, [groups, visibleRows]);

  return (
    <div className="movie-table-container">
      <div className="vault-toolbar">
        <label className="vault-search"><Search aria-hidden="true" /><input className="vault-search-input" type="search" placeholder="Search your watchlog… (Cmd+K)" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} /></label>
        <label className="vault-genre-filter"><span>Genre</span><select value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)}>{allGenres.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
      </div>

      <div className="vault-groups">
        {visibleGroups.map((group, index) => {
          const isCollapsed = Boolean(collapsedGroups[group.id]);
          return <div key={group.id}>
            {group.section && groups[index - 1]?.section !== group.section && <h2 className="vault-section-heading">{group.section}</h2>}
            <section className="vault-group">
            <button type="button" className="vault-group-heading" aria-expanded={!isCollapsed} onClick={() => setCollapsedGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}>
              {isCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}<i aria-hidden="true" /><strong>{group.title}</strong>
            </button>
            {!isCollapsed && <div className="vault-group-rows">
              {group.movies.map((movie, index) => {
                return <article className="vault-row" key={movie.id} role="button" tabIndex={0} aria-label={`Edit watch log for ${movie.title}`} onClick={() => onOpen(movie)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(movie); } }}>
                  <span className="vault-row-number">{index + 1}</span>
                  <div className="vault-title-cell"><strong>{movie.title}</strong></div>
                </article>;
              })}
            </div>}
            </section>
          </div>;
        })}
        {!groups.length && <div className="vault-empty">No watched titles match these filters.</div>}
        {visibleRows < filteredMovies.length && <button type="button" className="load-more-movies" onClick={() => setVisibleRows((count) => count + ROWS_PER_PAGE)}>Show more titles ({filteredMovies.length - visibleRows} remaining)</button>}
      </div>
    </div>
  );
}
