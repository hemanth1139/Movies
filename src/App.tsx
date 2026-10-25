import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpAZ, CalendarDays, ChevronLeft, ChevronRight, Clock3, LayoutGrid, List, Plus, Shuffle } from 'lucide-react';
import Header from './components/Header';
import type { AppView } from './components/Sidebar';
import GenreFilters from './components/GenreFilters';
import PosterGrid, { SkeletonGrid } from './components/PosterGrid';
import NetflixBillboard from './components/NetflixBillboard';
import AddTitleModal from './components/AddTitleModal';
import EditModal from './components/EditModal';
import WatchLogModal from './components/WatchLogModal';
import type { Movie } from './types/movie';
import { deleteMovie, getMovies, updateMovie } from './lib/database';
import { supabase } from './lib/supabase';
import { emptyWatchLogEntry, type WatchLogEntry, type WatchLogMap } from './types/watchLog';
import { applyCachedTmdbMetadata, enrichMoviesFromTMDB, getMovieDetails } from './lib/tmdb';
import { normalizeGenreName } from './lib/genres';

type SortMode = 'az' | 'recent';
type HomeSortMode = 'recent' | 'year' | 'shuffle';
type ViewMode = 'grid' | 'list';
const WATCH_LOG_STORAGE_KEY = 'watchlog.entries.v1';
const FAVORITES_STORAGE_KEY = 'watchlog.favorites.v1';

function loadWatchLog(): WatchLogMap {
  try {
    const saved = window.localStorage.getItem(WATCH_LOG_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, Partial<WatchLogEntry>>;
    return Object.fromEntries(Object.entries(parsed).map(([id, entry]) => [id, {
      rating: entry.rating ?? 0,
      watchedDate: entry.watchedDate ?? '',
      rewatch: entry.rewatch ?? false,
      review: entry.review ?? '',
      watchedEpisodes: entry.watchedEpisodes ?? [],
      totalSeasons: entry.totalSeasons ?? 0,
      watchedSeasons: entry.watchedSeasons ?? [],
    }]));
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

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [homeSortMode, setHomeSortMode] = useState<HomeSortMode>('recent');
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeView, setActiveView] = useState<AppView>('Home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [watchingMovie, setWatchingMovie] = useState<Movie | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [watchLog, setWatchLog] = useState<WatchLogMap>(loadWatchLog);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadFavorites);
  const [deleteError, setDeleteError] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => { void loadMovies(); }, []);
  useEffect(() => {
    try { window.localStorage.setItem(WATCH_LOG_STORAGE_KEY, JSON.stringify(watchLog)); } catch { /* Storage may be disabled. */ }
  }, [watchLog]);
  useEffect(() => {
    try { window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds)); } catch { /* Storage may be disabled. */ }
  }, [favoriteIds]);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadMovies = async () => {
    setLoading(true);
    const data = await getMovies();
    const withCachedMetadata = applyCachedTmdbMetadata(data);
    setMovies(withCachedMetadata);
    const today = new Date().toISOString().slice(0, 10);
    setWatchLog((current) => {
      const next = { ...current };
      withCachedMetadata.forEach((movie) => {
        const previous = next[movie.id];
        next[movie.id] = {
          rating: previous?.rating ?? 0,
          watchedDate: previous?.watchedDate || today,
          rewatch: previous?.rewatch ?? false,
          review: previous?.review ?? '',
          watchedEpisodes: previous?.watchedEpisodes ?? [],
          watchedSeasons: previous?.watchedSeasons ?? [],
          totalSeasons: previous?.totalSeasons ?? 0,
        };
      });
      return next;
    });
    setLoading(false);
    void enrichMoviesFromTMDB(withCachedMetadata, (movieId, metadata) => {
      setMovies((current) => current.map((movie) => movie.id === movieId ? { ...movie, ...metadata } : movie));
      if (supabase) {
        const { tmdb_id, poster_path, release_year } = metadata;
        // The existing Supabase schema stores poster paths and IDs; cinematic backdrop/overview data stays cached locally.
        void updateMovie(movieId, { tmdb_id, poster_path, release_year });
      }
    });
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]);
  };
  const hasActiveFilters = selectedGenres.length > 0 || searchQuery.trim().length > 0;
  const clearFilters = () => { setSelectedGenres([]); setSearchQuery(''); };
  const handleTitleAdded = (movie: Movie) => {
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
    if (await deleteMovie(movie.id)) {
      setMovies((prev) => prev.filter((item) => item.id !== movie.id));
      setWatchLog((prev) => {
        const next = { ...prev };
        delete next[movie.id];
        return next;
      });
    } else {
      setDeleteError('Could not delete this title from the database. Check your connection and try again.');
    }
  };
  const handlePageChange = (view: AppView) => {
    setActiveView(view);
    setSelectedGenres([]);
    setSearchQuery('');
    setExpandedCategories({});
  };
  const openWatchLog = (movie: Movie | null = null) => { setWatchingMovie(movie); setIsWatchModalOpen(true); };
  const saveWatchLog = (movieId: string, entry: WatchLogEntry) => setWatchLog((prev) => ({ ...prev, [movieId]: entry }));
  const toggleFavorite = (movieId: string) => setFavoriteIds((current) => current.includes(movieId)
    ? current.filter((id) => id !== movieId)
    : [...current, movieId]);
  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchingMovies = movies.filter((movie) => {
      if (activeView === 'Movies' && (movie.type !== 'Movie' || isAnimeOrAnimation(movie))) return false;
      if (activeView === 'Series' && (movie.type !== 'TV Series' || isAnimeOrAnimation(movie))) return false;
      if (activeView === 'Anime' && !isAnimeOrAnimation(movie)) return false;
      if (selectedGenres.length && !selectedGenres.some((genre) => movie.genres.some((item) => normalizeGenreName(item).toLowerCase().includes(normalizeGenreName(genre).toLowerCase())))) return false;
      return !query || movie.title.toLowerCase().includes(query);
    });
    const titles = dedupeMovies(matchingMovies);
    if (activeView === 'Home') {
      const watchedAt = (movie: Movie) => new Date(watchLog[movie.id]?.watchedDate || movie.created_at).getTime() || 0;
      const shuffleRank = (movie: Movie) => {
        let hash = Math.floor(shuffleSeed * 1_000_000) | 0;
        for (const char of movie.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
        return hash >>> 0;
      };
      return titles.sort((a, b) => {
        if (homeSortMode === 'shuffle') return shuffleRank(a) - shuffleRank(b);
        if (homeSortMode === 'year') return (b.release_year ?? 0) - (a.release_year ?? 0) || watchedAt(b) - watchedAt(a) || a.title.localeCompare(b.title);
        return watchedAt(b) - watchedAt(a) || (b.release_year ?? 0) - (a.release_year ?? 0) || a.title.localeCompare(b.title);
      });
    }
    return titles.sort((a, b) => sortMode === 'recent'
      ? new Date(watchLog[b.id]?.watchedDate || b.created_at).getTime() - new Date(watchLog[a.id]?.watchedDate || a.created_at).getTime()
      : a.title.localeCompare(b.title));
  }, [movies, activeView, selectedGenres, searchQuery, sortMode, homeSortMode, shuffleSeed, watchLog]);

  const collectionView = ['Movies', 'Series', 'Anime'].includes(activeView);
  const categorySections = useMemo(() => {
    if (searchQuery.trim()) return [{ title: 'Search results', movies: filteredMovies }];
    if (activeView === 'Home') {
      const sections = [
        { title: 'Movies', movies: filteredMovies.filter((movie) => movie.type === 'Movie' && !isAnimeOrAnimation(movie)) },
        { title: 'Series', movies: filteredMovies.filter((movie) => movie.type === 'TV Series' && !isAnimeOrAnimation(movie)) },
        { title: 'Anime', movies: filteredMovies.filter(isAnimeOrAnimation) },
      ];
      return [...sections, ...groupByGenreUnique(filteredMovies).filter((section) => !['anime', 'animation'].includes(section.title.toLowerCase()))]
        .filter((section) => section.movies.length > 0);
    }
    if (activeView === 'Anime') {
      return [
        { title: 'Movies', movies: filteredMovies.filter((movie) => movie.type === 'Movie') },
        { title: 'Series', movies: filteredMovies.filter((movie) => movie.type === 'TV Series') },
      ];
    }
    return groupByGenreUnique(filteredMovies).filter((section) => section.title.toLowerCase() !== 'animation');
  }, [activeView, filteredMovies, searchQuery]);
  const renderCategory = (title: string, items: Movie[]) => {
    const key = `${activeView}-${title}`;
    return <CategoryShelf key={key} title={title} movies={items} view={activeView === 'Home' ? 'grid' : viewMode} expanded={Boolean(expandedCategories[key])}
      previewOnly={activeView === 'Home'}
      rail={activeView === 'Home'}
      showRanks={title === 'Top 10 Favorites'}
      onToggle={() => setExpandedCategories((current) => ({ ...current, [key]: !current[key] }))}
      onAddClick={() => setIsAddModalOpen(true)} onMovieEdit={handleMovieEdit}
      onMovieDelete={(movie) => void handleMovieDelete(movie)} onMovieOpen={openWatchLog} watchLog={watchLog}
      favoriteIds={favoriteIds} onFavoriteToggle={toggleFavorite} />;
  };

  const billboardMovie = ['Home', 'Movies', 'Series'].includes(activeView) && !searchQuery.trim()
    ? filteredMovies.find((movie) => movie.backdrop_path) ?? filteredMovies[0]
    : null;
  const favoriteMovies = filteredMovies.filter((movie) => favoriteIds.includes(movie.id))
    .sort((a, b) => (watchLog[b.id]?.rating ?? 0) - (watchLog[a.id]?.rating ?? 0)
      || new Date(watchLog[b.id]?.watchedDate || b.created_at).getTime() - new Date(watchLog[a.id]?.watchedDate || a.created_at).getTime())
    .slice(0, 10);

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
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddClick={() => openWatchLog()} activeView={activeView} onViewChange={handlePageChange} />

        {billboardMovie && <NetflixBillboard movie={billboardMovie} rating={watchLog[billboardMovie.id]?.rating ?? 0} onDetails={() => openWatchLog(billboardMovie)} />}

        <main className="page-content">
          {activeView !== 'Anime' && <div className="genre-toolbar"><span className="genre-label">GENRES</span><GenreFilters movies={filteredMovies} selectedGenres={selectedGenres} onGenreToggle={handleGenreToggle} excludeAnime={activeView === 'Movies' || activeView === 'Series'} />{hasActiveFilters && <button type="button" onClick={clearFilters} className="clear-filter">Clear filters</button>}</div>}

          {deleteError && <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">{deleteError}</div>}

          {activeView === 'Home' && !searchQuery.trim() && <div className="home-sort-controls" role="group" aria-label="Sort home titles">
            <span>Browse by</span>
            <button type="button" onClick={() => setHomeSortMode('recent')} aria-pressed={homeSortMode === 'recent'}><Clock3 /> Recently watched</button>
            <button type="button" onClick={() => setHomeSortMode('year')} aria-pressed={homeSortMode === 'year'}><CalendarDays /> Newest year</button>
            <button type="button" onClick={() => { setShuffleSeed(Math.random()); setHomeSortMode('shuffle'); }} aria-pressed={homeSortMode === 'shuffle'}><Shuffle /> Shuffle</button>
          </div>}

          {activeView === 'Home' && <div className="browse-sections">
            {loading ? <div className="rails-loading">Loading titles…</div> : categorySections.length ? [...(favoriteMovies.length ? [{ title: 'Top 10 Favorites', movies: favoriteMovies }] : []), ...categorySections].map((section) => renderCategory(section.title, section.movies)) : (
              <section className="empty-rail"><h2>Your collection is empty</h2><p>Add a movie or series to start your watch log.</p><button type="button" onClick={() => openWatchLog()} className="netflix-primary-button"><Plus size={16} /> Log a watch</button></section>
            )}
          </div>}

          {collectionView && <section className="collection-section">
            <div className="collection-toolbar"><div><h2>{activeView}</h2><p>{filteredMovies.length} {filteredMovies.length === 1 ? 'title' : 'titles'} in your library</p></div><div className="collection-controls"><div className="segmented-control" role="group" aria-label="Sort titles"><button type="button" onClick={() => setSortMode('az')} aria-pressed={sortMode === 'az'}><ArrowUpAZ className="h-4 w-4" /> A–Z</button><button type="button" onClick={() => setSortMode('recent')} aria-pressed={sortMode === 'recent'}><Clock3 className="h-4 w-4" /> Recent</button></div><div className="segmented-control view-control" role="group" aria-label="View mode"><button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="List view"><List className="h-4 w-4" /></button></div></div></div>
            {loading ? <SkeletonGrid view={viewMode} /> : categorySections.length ? <div className="browse-sections">{categorySections.map((section) => renderCategory(section.title, section.movies))}</div> : <div className="empty-panel"><h2>No titles in this category</h2><p>{hasActiveFilters ? 'Try clearing your search or genre filters.' : 'Add titles to see them grouped by genre.'}</p><button type="button" className="amber-button" onClick={() => setIsAddModalOpen(true)}><Plus className="h-4 w-4" /> Add a title</button></div>}
          </section>}
        </main>

        <footer className="app-footer">
          <span>Watchlog · Your personal cinema</span>
          <a className="tmdb-attribution" href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noreferrer">
            <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg" alt="TMDB" />
            <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
          </a>
        </footer>
      </div>

      {showBackToTop && <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ArrowDown className="h-4 w-4 rotate-180" /></button>}

      <AddTitleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onTitleAdded={handleTitleAdded} />
      <WatchLogModal isOpen={isWatchModalOpen} movies={movies} initialMovie={watchingMovie} watchLog={watchLog} onClose={() => { setIsWatchModalOpen(false); setWatchingMovie(null); }} onSave={saveWatchLog} onAddTitle={() => { setIsWatchModalOpen(false); setWatchingMovie(null); setIsAddModalOpen(true); }} />
      {editingMovie && <EditModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingMovie(null); }} movie={editingMovie} onMovieUpdated={handleMovieUpdated} />}
    </div>
  );
}

function groupByGenreUnique(movies: Movie[]) {
  const genres = [...new Set(movies.flatMap((movie) => movie.genres.map(normalizeGenreName)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const displayedIds = new Set<string>();
  return genres.map((title) => {
    const rowMovies = movies.filter((movie) => !displayedIds.has(movie.id)
      && movie.genres.some((genre) => normalizeGenreName(genre).toLowerCase() === title.toLowerCase()));
    rowMovies.forEach((movie) => displayedIds.add(movie.id));
    return { title, movies: rowMovies };
  }).filter((section) => section.movies.length > 0);
}

function isAnimeOrAnimation(movie: Movie) {
  return movie.genres.some((genre) => {
    const normalized = normalizeGenreName(genre).toLowerCase();
    return normalized === 'anime' || normalized === 'animation';
  });
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

interface CategoryShelfProps {
  title: string;
  movies: Movie[];
  view: ViewMode;
  expanded: boolean;
  previewOnly: boolean;
  rail: boolean;
  showRanks: boolean;
  onToggle: () => void;
  onAddClick: () => void;
  onMovieEdit: (movie: Movie) => void;
  onMovieDelete: (movie: Movie) => void;
  onMovieOpen: (movie: Movie) => void;
  watchLog: WatchLogMap;
  favoriteIds: string[];
  onFavoriteToggle: (movieId: string) => void;
}

function CategoryShelf({ title, movies, view, expanded, previewOnly, rail, showRanks, onToggle, onAddClick, onMovieEdit, onMovieDelete, onMovieOpen, watchLog, favoriteIds, onFavoriteToggle }: CategoryShelfProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visibleMovies = showRanks || !previewOnly || expanded ? movies : movies.slice(0, 8);
  useEffect(() => {
    const element = railRef.current;
    if (!element || !rail) return;
    const update = () => {
      setCanScrollLeft(element.scrollLeft > 1);
      setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', update); observer.disconnect(); };
  }, [rail, visibleMovies.length]);
  const scroll = (direction: -1 | 1) => {
    const element = railRef.current;
    if (element) element.scrollBy({ left: direction * Math.min(1000, element.clientWidth * 0.85), behavior: 'smooth' });
  };
  return (
    <section className="category-section" aria-label={`${title} titles`}>
      <div className="category-heading">
        <div><h2>{title}</h2><span>{movies.length} {movies.length === 1 ? 'title' : 'titles'}</span></div>
        {previewOnly && !showRanks && movies.length > 8 && <button type="button" onClick={onToggle}>{expanded ? 'Show less' : 'Show all'}</button>}
      </div>
      {rail ? <div className="category-rail-frame">
        <button type="button" className="category-rail-arrow left" aria-label={`Scroll ${title} left`} disabled={!canScrollLeft} onClick={() => scroll(-1)}><ChevronLeft /></button>
        <div className="category-rail-scroll" ref={railRef}>
          <PosterGrid movies={visibleMovies} view="grid" rail isEmptyCollection={false} hasActiveFilters={false} onAddClick={onAddClick} onMovieEdit={onMovieEdit} onMovieDelete={onMovieDelete} onMovieOpen={onMovieOpen} watchLog={watchLog} favoriteIds={favoriteIds} onFavoriteToggle={onFavoriteToggle} showRanks={showRanks} />
        </div>
        <button type="button" className="category-rail-arrow right" aria-label={`Scroll ${title} right`} disabled={!canScrollRight} onClick={() => scroll(1)}><ChevronRight /></button>
      </div> : <PosterGrid movies={visibleMovies} view={view} isEmptyCollection={false} hasActiveFilters={false} onAddClick={onAddClick} onMovieEdit={onMovieEdit} onMovieDelete={onMovieDelete} onMovieOpen={onMovieOpen} watchLog={watchLog} favoriteIds={favoriteIds} onFavoriteToggle={onFavoriteToggle} />}
    </section>
  );
}

