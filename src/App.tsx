import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, LayoutGrid, List, Plus } from 'lucide-react';
import Header from './components/Header';
import type { AppView } from './components/Sidebar';
import GenreFilters from './components/GenreFilters';
import PosterGrid, { SkeletonGrid } from './components/PosterGrid';
import NetflixBillboard from './components/NetflixBillboard';
import NetflixDetailModal from './components/NetflixDetailModal';
import AddTitleModal from './components/AddTitleModal';
import EditModal from './components/EditModal';
import WatchLogModal from './components/WatchLogModal';
import LogbookPage from './components/LogbookPage';
import CategoryShelf from './components/CategoryShelf';
import type { Movie } from './types/movie';
import { deleteMovie, getMovies, restoreMovie, updateMovie } from './lib/database';
import { supabase } from './lib/supabase';
import { emptyWatchLogEntry, type WatchLogEntry, type WatchLogMap } from './types/watchLog';
import { applyCachedTmdbMetadata, cacheMovieMetadata, enrichMoviesFromTMDB, getMovieDetails } from './lib/tmdb';
import { applyBundledPosters } from './lib/bundledPosters';
import { normalizeGenreName } from './lib/genres';
import { isAnimeTitle } from './lib/animeUtils';

type SortMode = 'az' | 'recent' | 'year' | 'rating' | 'timeline';
type ViewMode = 'grid' | 'list';
const WATCH_LOG_STORAGE_KEY = 'watchlog.entries.v1';
const TMDB_CACHE_STORAGE_KEY = 'watchlog.tmdb-csv-metadata.v8';
const INITIAL_VISIBLE_MOVIES = 48;
const MOVIES_PER_PAGE = 48;
const FAVORITES_STORAGE_KEY = 'watchlog.favorites.v1';
const FEATURED_MOVIES_STORAGE_KEY = 'watchlog.featured-movies.v1';
const DELETED_MOVIES_STORAGE_KEY = 'watchlog.deleted-movies.v1';
const UNIVERSE_CLEANUP_STORAGE_KEY = 'watchlog.universe-cleanup.v1';
const ALLOWED_UNIVERSES = new Set(['Marvel Cinematic Universe', 'The Conjuring Universe', 'DC Universe', 'Disney & Pixar']);

function saveCriticalStorageValue(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    try {
      // Keep the user's watch log and favorites ahead of rebuildable poster metadata.
      window.localStorage.removeItem(TMDB_CACHE_STORAGE_KEY);
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function loadWatchLog(): WatchLogMap {
  try {
    const shouldCleanUniverses = window.localStorage.getItem(UNIVERSE_CLEANUP_STORAGE_KEY) !== 'done';
    const saved = window.localStorage.getItem(WATCH_LOG_STORAGE_KEY);
    if (!saved) {
      if (shouldCleanUniverses) window.localStorage.setItem(UNIVERSE_CLEANUP_STORAGE_KEY, 'done');
      return {};
    }
    const parsed = JSON.parse(saved) as Record<string, Partial<WatchLogEntry>>;
    const watchLog = Object.fromEntries(Object.entries(parsed).map(([id, entry]) => [id, {
      rating: entry.rating ?? 0,
      watchedDate: entry.watchedDate ?? '',
      rewatch: entry.rewatch ?? false,
      review: entry.review ?? '',
      watchedEpisodes: entry.watchedEpisodes ?? [],
      totalSeasons: entry.totalSeasons ?? 0,
      universe: !shouldCleanUniverses || ALLOWED_UNIVERSES.has(entry.universe ?? '') ? entry.universe ?? '' : '',
      universeOrder: entry.universeOrder,
      watchedSeasons: entry.watchedSeasons ?? [],
    }]));
    if (shouldCleanUniverses) window.localStorage.setItem(UNIVERSE_CLEANUP_STORAGE_KEY, 'done');
    return watchLog;
  } catch {
    return {};
  }
}

function loadFavorites(): string[] {
  try {
    const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return saved ? JSON.parse(saved) as string[] : [];
  } catch { return []; }
}

function loadDeletedMovies(): Movie[] {
  try {
    const saved = window.localStorage.getItem(DELETED_MOVIES_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) as unknown : [];
    return Array.isArray(parsed) ? parsed as Movie[] : [];
  } catch { return []; }
}

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreMovies, setLoadingMoreMovies] = useState(true);
  const [enrichingMetadata, setEnrichingMetadata] = useState(false);
  const [moreMetadataAvailable, setMoreMetadataAvailable] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [animeKind, setAnimeKind] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedUniverse, setSelectedUniverse] = useState('');
  const [featuredIndex, setFeaturedIndex] = useState(() => Math.floor(Math.random() * 5));
  const [featuredSeed] = useState(() => Math.random());
  const [previousFeaturedIds] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem(FEATURED_MOVIES_STORAGE_KEY) || '[]') as string[]; }
    catch { return []; }
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeView, setActiveView] = useState<AppView>('Home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [watchingMovie, setWatchingMovie] = useState<Movie | null>(null);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [watchLog, setWatchLog] = useState<WatchLogMap>(loadWatchLog);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadFavorites);
  const [deletedMovies, setDeletedMovies] = useState<Movie[]>(loadDeletedMovies);
  const deletedMoviesRef = useRef(deletedMovies);
  const [deleteError, setDeleteError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [databaseError, setDatabaseError] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [visibleMovieCount, setVisibleMovieCount] = useState(INITIAL_VISIBLE_MOVIES);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const loadStarted = useRef(false);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    void loadMovies();
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!saveCriticalStorageValue(WATCH_LOG_STORAGE_KEY, JSON.stringify(watchLog))) setStorageWarning(true);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [watchLog]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!saveCriticalStorageValue(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds))) setStorageWarning(true);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [favoriteIds]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!saveCriticalStorageValue(DELETED_MOVIES_STORAGE_KEY, JSON.stringify(deletedMovies))) setStorageWarning(true);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [deletedMovies]);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setVisibleMovieCount(INITIAL_VISIBLE_MOVIES); }, [activeView, searchQuery, selectedGenres, selectedUniverse, animeKind]);

  const runMetadataBatch = async (sourceMovies: Movie[]) => {
    setEnrichingMetadata(true);
    setMoreMetadataAvailable(false);
    try {
      const hasMore = await enrichMoviesFromTMDB(sourceMovies.filter((movie) => !movie.poster_path), (movieId, metadata) => {
        setMovies((current) => current.map((movie) => movie.id === movieId ? { ...movie, ...metadata } : movie));
        if (supabase) {
          const { tmdb_id, poster_path, release_year } = metadata;
          void updateMovie(movieId, { tmdb_id, poster_path, release_year });
        }
      });
      setMoreMetadataAvailable(hasMore);
    } finally {
      setEnrichingMetadata(false);
    }
  };

  const loadMovies = async () => {
    setLoading(true);
    setLoadingMoreMovies(true);
    const today = new Date().toISOString().slice(0, 10);
    let allMovies: Movie[] = [];
    const data = await getMovies((page, firstPage) => {
      const enrichedPage = applyBundledPosters(applyCachedTmdbMetadata(page));
      allMovies = firstPage ? enrichedPage : [...allMovies, ...enrichedPage];
      setMovies(allMovies);
      setLoading(false);
      setWatchLog((current) => {
        const next = { ...current };
        enrichedPage.forEach((movie) => {
          const previous = next[movie.id];
          next[movie.id] = {
            rating: previous?.rating ?? 0,
            watchedDate: previous?.watchedDate || today,
            rewatch: previous?.rewatch ?? false,
            review: previous?.review ?? '',
            watchedEpisodes: previous?.watchedEpisodes ?? [],
            watchedSeasons: previous?.watchedSeasons ?? [],
            totalSeasons: previous?.totalSeasons ?? 0,
            universe: previous?.universe ?? movie.universe ?? movie.franchise ?? '',
            universeOrder: previous?.universeOrder,
          };
        });
        return next;
      });
    }).catch((error: unknown) => {
      console.error('Could not load the collection.', error);
      setDatabaseError('Could not finish loading the collection. Check your connection and reload to try again.');
      return [] as Movie[];
    });
    if (!allMovies.length && data.length) {
      allMovies = applyBundledPosters(applyCachedTmdbMetadata(data));
      setMovies(allMovies);
    }
    setLoading(false);
    setLoadingMoreMovies(false);
    void runMetadataBatch(allMovies);
  };

  const handleGenreToggle = (genre: string) => {
    if (genre === 'All') { setSelectedGenres([]); return; }
    setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]);
  };
  const hasActiveFilters = selectedGenres.length > 0 || searchQuery.trim().length > 0;
  const clearFilters = () => { setSelectedGenres([]); setSearchQuery(''); };
  const handleTitleAdded = (movie: Movie) => {
    cacheMovieMetadata(movie);
    setMovies((prev) => [...prev, movie]);
    setWatchLog((prev) => ({ ...prev, [movie.id]: { ...emptyWatchLogEntry(), watchedDate: new Date().toISOString().slice(0, 10) } }));
  };
  const handleMovieEdit = (movie: Movie) => { setEditingMovie(movie); setIsEditModalOpen(true); };
  const handleMovieUpdated = (updatedMovie: Movie) => setMovies((prev) => prev.map((item) => item.id === updatedMovie.id ? updatedMovie : item));
  const handleMovieDelete = async (movie: Movie) => {
    setDeleteError('');
    if (!supabase) {
      setDeleteError('Database connection is unavailable, so this title was not deleted.');
      return;
    }
    const nextDeletedMovies = [...deletedMoviesRef.current.filter((item) => item.id !== movie.id), movie];
    try {
      if (!saveCriticalStorageValue(DELETED_MOVIES_STORAGE_KEY, JSON.stringify(nextDeletedMovies))) throw new Error('Browser storage is full.');
      deletedMoviesRef.current = nextDeletedMovies;
    } catch {
      setDeleteError('Could not save a recovery copy, so this title was not deleted.');
      return;
    }
    if (await deleteMovie(movie.id)) {
      setDeletedMovies(deletedMoviesRef.current);
      setMovies((prev) => prev.filter((item) => item.id !== movie.id));
    } else {
      const rollback = deletedMoviesRef.current.filter((item) => item.id !== movie.id);
      deletedMoviesRef.current = rollback;
      setDeletedMovies(rollback);
      saveCriticalStorageValue(DELETED_MOVIES_STORAGE_KEY, JSON.stringify(rollback));
      setDeleteError('Could not delete this title from the database. Check your connection and try again.');
    }
  };
  const handleMovieRestore = async (movie: Movie) => {
    setDeleteError('');
    const restored = await restoreMovie(movie);
    if (!restored) {
      setDeleteError('Could not restore this title. Check your connection and try again.');
      return;
    }
    setMovies((current) => [...current, { ...movie, ...restored }].sort((a, b) => a.title.localeCompare(b.title)));
    const remainingDeletedMovies = deletedMoviesRef.current.filter((item) => item.id !== movie.id);
    deletedMoviesRef.current = remainingDeletedMovies;
    setDeletedMovies(remainingDeletedMovies);
  };
  const handlePageChange = (view: AppView) => {
    setActiveView(view);
    setSelectedGenres([]);
    setSearchQuery('');
    setSortMode('recent');
    setSelectedUniverse('');
    setExpandedCategories({});
  };
  const openWatchLog = (movie: Movie | null = null) => { setWatchingMovie(movie); setIsWatchModalOpen(true); };
  const saveWatchLog = (movieId: string, entry: WatchLogEntry) => {
    setWatchLog((prev) => ({ ...prev, [movieId]: entry }));
    setMovies((current) => current.map((movie) => movie.id === movieId ? { ...movie, universe: entry.universe || undefined, universeOrder: entry.universeOrder, franchise: entry.universe || null } : movie));
    if (supabase) void updateMovie(movieId, { franchise: entry.universe || null });
  };
  const removeWatchLog = (movieId: string) => setWatchLog((prev) => { const next = { ...prev }; delete next[movieId]; return next; });
  const toggleFavorite = (movieId: string) => setFavoriteIds((current) => current.includes(movieId)
    ? current.filter((id) => id !== movieId)
    : [...current, movieId]);
  const categoryMovies = useMemo(() => movies.filter((movie) => {
    if (activeView === 'Movies' && (movie.type !== 'Movie' || isAnimeTitle(movie))) return false;
    if (activeView === 'Series' && (movie.type !== 'TV Series' || isAnimeTitle(movie))) return false;
    if (activeView === 'Anime' && !isAnimeTitle(movie)) return false;
    if (activeView === 'Anime' && animeKind === 'movie' && movie.type !== 'Movie') return false;
    if (activeView === 'Anime' && animeKind === 'series' && movie.type !== 'TV Series') return false;
    if (selectedUniverse && activeView === 'Movies') {
      const universe = watchLog[movie.id]?.universe || movie.universe || movie.franchise || '';
      if (universe !== selectedUniverse || movie.type !== 'Movie') return false;
    }
    if (selectedUniverse && (activeView === 'Series' || activeView === 'Anime') && (watchLog[movie.id]?.universe || movie.universe || movie.franchise || '') !== selectedUniverse) return false;
    return true;
  }), [movies, activeView, animeKind, selectedUniverse, selectedUniverse ? watchLog : null]);
  const filteredMovies = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    const matchingMovies = categoryMovies.filter((movie) => {
      if (selectedGenres.length && !selectedGenres.some((genre) => genre.toLowerCase() === 'mcu'
        ? /marvel/i.test(movie.universe || movie.franchise || '') || movie.genres.some((item) => item.toLowerCase() === 'mcu')
        : movie.genres.some((item) => normalizeGenreName(item).toLowerCase().includes(normalizeGenreName(genre).toLowerCase())))) return false;
      return !query || movie.title.toLowerCase().includes(query);
    });
    const titles = dedupeMovies(matchingMovies);
    if (activeView === 'Home') {
      const watchedAt = (movie: Movie) => new Date(watchLog[movie.id]?.watchedDate || movie.created_at).getTime() || 0;
      return titles.sort((a, b) => watchedAt(b) - watchedAt(a) || (b.release_year ?? 0) - (a.release_year ?? 0) || a.title.localeCompare(b.title));
    }
    return titles.sort((a, b) => {
      if (sortMode === 'year' && activeView === 'Movies' && selectedUniverse) return (a.release_year ?? 0) - (b.release_year ?? 0) || a.title.localeCompare(b.title);
      if (sortMode === 'timeline' && activeView === 'Movies' && selectedUniverse) return (watchLog[a.id]?.universeOrder ?? Number.MAX_SAFE_INTEGER) - (watchLog[b.id]?.universeOrder ?? Number.MAX_SAFE_INTEGER) || (a.release_year ?? 0) - (b.release_year ?? 0);
      if (sortMode === 'year') return (b.release_year ?? 0) - (a.release_year ?? 0) || a.title.localeCompare(b.title);
      if (sortMode === 'rating') return (watchLog[b.id]?.rating ?? 0) - (watchLog[a.id]?.rating ?? 0) || a.title.localeCompare(b.title);
      if (sortMode === 'recent') return new Date(watchLog[b.id]?.watchedDate || b.created_at).getTime() - new Date(watchLog[a.id]?.watchedDate || a.created_at).getTime();
      return a.title.localeCompare(b.title);
    });
  }, [categoryMovies, activeView, selectedGenres, deferredSearchQuery, sortMode, selectedUniverse,
    activeView === 'Home' || ['recent', 'rating', 'timeline'].includes(sortMode) ? watchLog : null]);

  const collectionView = ['Movies', 'Series', 'Anime'].includes(activeView);
  const curatedSections = useMemo(() => {
    const sections = new Map<string, Movie[]>([
      ['2025 & 2026 Releases', []], ['5-Star Masterpieces', []], ['Cinematic Universes Spotlight', []],
      ['Spine-Chilling Horror', []], ['Sci-Fi & Mind-Benders', []], ['K-Dramas & International', []], ['Anime Showcase', []],
    ]);
    for (const movie of movies) {
      const genres = movie.genres.map((genre) => normalizeGenreName(genre).toLowerCase());
      const add = (name: string) => sections.get(name)?.push(movie);
      if (movie.release_year === 2025 || movie.release_year === 2026) add('2025 & 2026 Releases');
      if ((watchLog[movie.id]?.rating ?? 0) === 5) add('5-Star Masterpieces');
      if (watchLog[movie.id]?.universe || movie.universe || movie.franchise) add('Cinematic Universes Spotlight');
      if (genres.includes('horror')) add('Spine-Chilling Horror');
      if (genres.some((genre) => genre === 'science fiction' || genre === 'mystery')) add('Sci-Fi & Mind-Benders');
      if (movie.type === 'TV Series' && genres.some((genre) => genre === 'foreign' || genre === 'drama')) add('K-Dramas & International');
      if (isAnimeTitle(movie)) add('Anime Showcase');
    }
    const recentlyLogged = [...movies].sort((a, b) =>
      new Date(watchLog[b.id]?.watchedDate || b.created_at).getTime() - new Date(watchLog[a.id]?.watchedDate || a.created_at).getTime()
    ).slice(0, 12);
    return [
      { title: 'Recently Logged', movies: recentlyLogged },
      ...[...sections].map(([title, items]) => ({ title, movies: items })),
    ].filter((section) => section.movies.length > 0);
  }, [movies, watchLog]);
  const renderCategory = (title: string, items: Movie[]) => {
    const key = `Home-${title}`;
    return <CategoryShelf key={key} title={title} movies={items} view="grid" expanded={Boolean(expandedCategories[key])}
      previewOnly={true}
      rail={true}
      showRanks={false}
      onToggle={() => setExpandedCategories((current) => ({ ...current, [key]: !current[key] }))}
      onAddClick={() => setIsAddModalOpen(true)} onMovieEdit={handleMovieEdit}
      onMovieDelete={(movie) => void handleMovieDelete(movie)} onMovieOpen={openWatchLog} watchLog={watchLog}
      favoriteIds={favoriteIds} onFavoriteToggle={toggleFavorite} />;
  };

  const featuredMovies = useMemo(() => {
    const eligible = movies.filter((movie) => movie.backdrop_path || movie.poster_path);
    const getRandomRank = (movie: Movie) => {
      let hash = Math.floor(featuredSeed * 0x7fffffff) | 0;
      for (const character of movie.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
      return hash >>> 0;
    };
    const randomized = (items: Movie[]) => [...items].sort((a, b) => getRandomRank(a) - getRandomRank(b));
    const freshPool = eligible.filter((movie) => !previousFeaturedIds.includes(movie.id));
    const previousPool = eligible.filter((movie) => previousFeaturedIds.includes(movie.id));
    const allowPrevious = freshPool.length < 5;
    const moviesPool = [...randomized(freshPool.filter((movie) => movie.type === 'Movie')),
      ...(allowPrevious ? randomized(previousPool.filter((movie) => movie.type === 'Movie')) : [])];
    const seriesPool = [...randomized(freshPool.filter((movie) => movie.type === 'TV Series')),
      ...(allowPrevious ? randomized(previousPool.filter((movie) => movie.type === 'TV Series')) : [])];
    const selected: Movie[] = [];
    const firstPool = featuredSeed < 0.5 ? moviesPool : seriesPool;
    const secondPool = featuredSeed < 0.5 ? seriesPool : moviesPool;
    let firstIndex = 0;
    let secondIndex = 0;
    while (selected.length < 5 && (firstIndex < firstPool.length || secondIndex < secondPool.length)) {
      if (firstIndex < firstPool.length && selected.length < 5) selected.push(firstPool[firstIndex++]);
      if (secondIndex < secondPool.length && selected.length < 5) selected.push(secondPool[secondIndex++]);
    }
    return randomized(selected);
  }, [movies, featuredSeed, previousFeaturedIds]);

  useEffect(() => {
    if (!featuredMovies.length) return;
    try { window.localStorage.setItem(FEATURED_MOVIES_STORAGE_KEY, JSON.stringify(featuredMovies.map((movie) => movie.id))); }
    catch { /* Storage may be disabled. */ }
  }, [featuredMovies]);

  const billboardMovie = activeView === 'Home' && !searchQuery.trim() && featuredMovies.length
    ? featuredMovies[featuredIndex % featuredMovies.length]
    : null;

  useEffect(() => {
    if (activeView !== 'Home' || searchQuery.trim() || featuredMovies.length < 2) return;
    const rotateBillboard = window.setInterval(() => {
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setFeaturedIndex((index) => (index + 1) % featuredMovies.length);
    }, 5000);
    return () => window.clearInterval(rotateBillboard);
  }, [activeView, searchQuery, featuredMovies.length]);

  useEffect(() => {
    if (!billboardMovie?.tmdb_id || billboardMovie.backdrop_path) return;
    let current = true;
    const mediaType = billboardMovie.type === 'TV Series' ? 'tv' : 'movie';
    void getMovieDetails(billboardMovie.tmdb_id, mediaType).then((details) => {
      if (!current || !details) return;
      setMovies((items) => items.map((item) => item.id === billboardMovie.id
        ? { ...item, backdrop_path: details.backdrop_path ?? undefined, overview: details.overview ?? item.overview }
        : item));
    });
    return () => { current = false; };
  }, [billboardMovie?.id, billboardMovie?.tmdb_id, billboardMovie?.backdrop_path, billboardMovie?.type]);

  return (
    <div className="watch-app">
      <div className="app-main">
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddClick={() => setIsAddModalOpen(true)} activeView={activeView} onViewChange={handlePageChange} />

        {billboardMovie && <div className="home-hero-wrap"><NetflixBillboard key={billboardMovie.id} movie={billboardMovie} rating={watchLog[billboardMovie.id]?.rating ?? 0} onEditLog={() => openWatchLog(billboardMovie)} onDetails={() => setDetailsMovie(billboardMovie)} /><div className="hero-carousel-dots" aria-label="Featured titles">{featuredMovies.map((movie, index) => <button key={movie.id} type="button" aria-label={`Show featured title ${index + 1}: ${movie.title}`} aria-current={featuredIndex % featuredMovies.length === index ? 'true' : undefined} onClick={() => setFeaturedIndex(index)} />)}</div></div>}

        <main className={`page-content ${activeView === 'Logbook' ? 'logbook-page-content' : collectionView ? 'category-page-content' : 'home-page-content'}`}>
          {deleteError && <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">{deleteError}</div>}
          {databaseError && <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">{databaseError}</div>}
          {storageWarning && <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="alert">Browser storage is full or unavailable. Recent watch log changes may not persist after closing this page.</div>}
          {loadingMoreMovies && !loading && <p className="metadata-loading" role="status">Loading more titles from your collection…</p>}
          {enrichingMetadata && <p className="metadata-loading" role="status">Fetching missing poster details…</p>}
          {moreMetadataAvailable && !enrichingMetadata && <button type="button" className="metadata-batch-button" onClick={() => void runMetadataBatch(movies)}>Fetch the next 24 metadata matches</button>}

          {activeView === 'Home' && <div className="browse-sections">
            {loading ? <div className="rails-loading">Loading titles…</div> : curatedSections.length ? curatedSections.map((section) => renderCategory(section.title, section.movies)) : (
              <section className="empty-rail"><h2>Your collection is empty</h2><p>Add a movie or series to start your watch log.</p><button type="button" onClick={() => openWatchLog()} className="netflix-primary-button"><Plus size={16} /> Log a watch</button></section>
            )}
          </div>}

            {activeView === 'Logbook' && <LogbookPage movies={movies} watchLog={watchLog} onMovieOpen={openWatchLog} deletedMovies={deletedMovies} onMovieRestore={(movie) => void handleMovieRestore(movie)} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

          {collectionView && <section className="collection-section">
            <div className="category-header"><div className="category-heading-copy"><h1>{activeView}</h1></div><div className="collection-controls"><div className="segmented-control view-control" role="group" aria-label="View mode"><button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="List view"><List className="h-4 w-4" /></button></div></div></div>
            <div className="genre-toolbar"><div className="genre-toolbar-heading"><div><span className="genre-label">BROWSE BY GENRE</span><p>{selectedGenres.length ? `${selectedGenres.length} genre${selectedGenres.length === 1 ? '' : 's'} selected` : 'Find a film by its mood or style'}</p></div>{hasActiveFilters && <button type="button" onClick={clearFilters} className="genre-clear-button">Clear filters</button>}</div><GenreFilters movies={categoryMovies} selectedGenres={selectedGenres} onGenreToggle={handleGenreToggle} /></div>
            {activeView === 'Movies' && <UniverseHub movies={movies} watchLog={watchLog} selectedUniverse={selectedUniverse} onSelect={setSelectedUniverse} />}
            {(activeView === 'Series' || activeView === 'Anime') && <div className="universe-tag-row" role="group" aria-label="Filter by universe">{[...new Set(movies.filter((movie) => activeView === 'Anime' ? isAnimeTitle(movie) : movie.type === 'TV Series').map((movie) => watchLog[movie.id]?.universe || movie.universe || movie.franchise).filter((name): name is string => Boolean(name)))].map((name) => <button key={name} type="button" className={selectedUniverse === name ? 'universe-tag active' : 'universe-tag'} aria-pressed={selectedUniverse === name} onClick={() => setSelectedUniverse(selectedUniverse === name ? '' : name)}>{name}</button>)}</div>}
            {activeView === 'Anime' && <div className="anime-kind-filters" role="group" aria-label="Filter anime by format">{([['all','All Anime'],['movie','Anime Movies'],['series','Anime Series']] as const).map(([kind,label]) => <button key={kind} type="button" aria-pressed={animeKind === kind} onClick={() => setAnimeKind(kind)}>{label} ({kind === 'all' ? movies.filter(isAnimeTitle).length : movies.filter((movie) => isAnimeTitle(movie) && (kind === 'movie' ? movie.type === 'Movie' : movie.type === 'TV Series')).length})</button>)}</div>}
            {loading ? <SkeletonGrid view={viewMode} /> : <>
              <PosterGrid movies={filteredMovies.slice(0, visibleMovieCount)} view={viewMode} isEmptyCollection={false} hasActiveFilters={hasActiveFilters} onAddClick={() => setIsAddModalOpen(true)} onMovieEdit={handleMovieEdit} onMovieDelete={(movie) => void handleMovieDelete(movie)} onMovieOpen={openWatchLog} watchLog={watchLog} favoriteIds={favoriteIds} onFavoriteToggle={toggleFavorite} />
              {visibleMovieCount < filteredMovies.length && <button type="button" className="load-more-movies" onClick={() => setVisibleMovieCount((count) => count + MOVIES_PER_PAGE)}>Show more titles ({filteredMovies.length - visibleMovieCount} remaining)</button>}
            </>}
          </section>}
        </main>

      </div>

      {showBackToTop && <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ArrowDown className="h-4 w-4 rotate-180" /></button>}

      <AddTitleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onTitleAdded={handleTitleAdded} />
      <WatchLogModal isOpen={isWatchModalOpen} movies={movies} initialMovie={watchingMovie} watchLog={watchLog} favoriteIds={favoriteIds} onFavoriteToggle={toggleFavorite} onRemove={removeWatchLog} onClose={() => { setIsWatchModalOpen(false); setWatchingMovie(null); }} onSave={saveWatchLog} onAddTitle={() => { setIsWatchModalOpen(false); setWatchingMovie(null); setIsAddModalOpen(true); }} />
      {detailsMovie && <NetflixDetailModal movie={detailsMovie} rating={watchLog[detailsMovie.id]?.rating ?? 0} watchedDate={watchLog[detailsMovie.id]?.watchedDate ?? ''} review={watchLog[detailsMovie.id]?.review ?? ''} onClose={() => setDetailsMovie(null)} />}
      {editingMovie && <EditModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingMovie(null); }} movie={editingMovie} onMovieUpdated={handleMovieUpdated} />}
    </div>
  );
}

function UniverseHub({ movies, watchLog, selectedUniverse, onSelect }: {
  movies: Movie[];
  watchLog: WatchLogMap;
  selectedUniverse: string;
  onSelect: (value: string) => void;
}) {
  const countFor = (name: string) => movies.filter((movie) => (watchLog[movie.id]?.universe || movie.universe || movie.franchise) === name && movie.type === 'Movie' && !isAnimeTitle(movie)).length;
  const universes = [...new Set(movies.filter((movie) => movie.type === 'Movie' && !isAnimeTitle(movie)).map((movie) => watchLog[movie.id]?.universe || movie.universe || movie.franchise).filter((value): value is string => Boolean(value)))].filter((name) => countFor(name) > 4).sort();
  if (!universes.length) return null;
  return <>
    <section className="universe-section" aria-label="Movie universes">
      <div className="universe-hub">
        {universes.map((name) => {
          const active = selectedUniverse === name;
          const theme = name === 'Marvel Cinematic Universe' ? 'mcu' : name === 'The Conjuring Universe' ? 'conjuring' : name === 'DC Universe' ? 'dc' : name === 'Disney & Pixar' ? 'disney' : 'default';
          return <button key={name} type="button" className={`universe-card universe-card-${theme}${active ? ' active' : ''}`} aria-pressed={active} onClick={() => onSelect(active ? '' : name)}>
            <strong>{name}</strong>
          </button>;
        })}
      </div>
    </section>
  </>;
}

function dedupeMovies(movies: Movie[]) {
  const byTitle = new Map<string, Movie>();
  const score = (movie: Movie) => Number(Boolean(movie.poster_path)) * 4 + Number(Boolean(movie.tmdb_id)) * 2 + Number(Boolean(movie.overview)) + movie.genres.length;
  for (const movie of movies) {
    const key = `${movie.type}:${movie.title.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')}`;
    const previous = byTitle.get(key);
    if (!previous) {
      byTitle.set(key, movie);
      continue;
    }
    const preferred = score(movie) > score(previous) ? movie : previous;
    const other = preferred === movie ? previous : movie;
    byTitle.set(key, {
      ...other,
      ...preferred,
      poster_path: preferred.poster_path || other.poster_path,
      tmdb_id: preferred.tmdb_id || other.tmdb_id,
      overview: preferred.overview || other.overview,
      release_year: preferred.release_year || other.release_year,
      genres: [...new Map([...preferred.genres, ...other.genres].map((genre) => [genre.toLowerCase(), genre])).values()],
    });
  }
  return [...byTitle.values()];
}

