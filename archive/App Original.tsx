import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpAZ, CalendarDays, Clapperboard, Clock3, FileUp, LayoutGrid, List, Plus, Sparkles, X } from 'lucide-react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import type { FilterType } from './components/Navigation';
import type { AppView } from './components/Sidebar';
import Sidebar from './components/Sidebar';
import GenreFilters from './components/GenreFilters';
import DashboardOverview, { RecentHeading } from './components/DashboardOverview';
import PosterGrid, { SkeletonGrid } from './components/PosterGrid';
import AddTitleModal from './components/AddTitleModal';
import ImportModal from './components/ImportModal';
import EditModal from './components/EditModal';
import WatchLogModal from './components/WatchLogModal';
import NetflixHero from './components/NetflixHero';
import NetflixSwimlane from './components/NetflixSwimlane';
import NetflixDetailModal from './components/NetflixDetailModal';
import type { Movie } from './types/movie';
import { deleteMovie, getMovies } from './lib/database';
import { supabase } from './lib/supabase';
import { emptyWatchLogEntry, type WatchLogEntry, type WatchLogMap } from './types/watchLog';

type SortMode = 'az' | 'recent';
type ViewMode = 'grid' | 'list';
const WATCH_LOG_STORAGE_KEY = 'watchlog.entries.v1';

function loadWatchLog(): WatchLogMap {
  try {
    const saved = window.localStorage.getItem(WATCH_LOG_STORAGE_KEY);
    return saved ? JSON.parse(saved) as WatchLogMap : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('All');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeView, setActiveView] = useState<AppView>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [watchingMovie, setWatchingMovie] = useState<Movie | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [watchLog, setWatchLog] = useState<WatchLogMap>(loadWatchLog);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedNetflixMovie, setSelectedNetflixMovie] = useState<Movie | null>(null);

  useEffect(() => { void loadMovies(); }, []);
  useEffect(() => {
    try { window.localStorage.setItem(WATCH_LOG_STORAGE_KEY, JSON.stringify(watchLog)); } catch { /* Storage may be disabled. */ }
  }, [watchLog]);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadMovies = async () => {
    setLoading(true);
    const data = await getMovies();
    setMovies(data);
    setLoading(false);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]);
  };
  const hasActiveFilters = currentFilter !== 'All' || selectedGenres.length > 0 || searchQuery.trim().length > 0;
  const clearFilters = () => { setCurrentFilter('All'); setSelectedGenres([]); setSearchQuery(''); };
  const handleTitleAdded = (movie: Movie) => setMovies((prev) => [...prev, movie]);
  const handleMovieEdit = (movie: Movie) => { setEditingMovie(movie); setIsEditModalOpen(true); };
  const handleMovieUpdated = (updatedMovie: Movie) => setMovies((prev) => prev.map((item) => item.id === updatedMovie.id ? updatedMovie : item));
  const handleMovieDelete = async (movie: Movie) => {
    if (!supabase) { setMovies((prev) => prev.filter((item) => item.id !== movie.id)); return; }
    if (await deleteMovie(movie.id)) setMovies((prev) => prev.filter((item) => item.id !== movie.id));
  };
  const handlePageChange = (view: AppView) => {
    setActiveView(view);
    if (view === 'Movies') setCurrentFilter('Movie');
    else if (view === 'TV Series') setCurrentFilter('TV Series');
    else setCurrentFilter('All');
  };
  const openWatchLog = (movie: Movie | null = null) => { setWatchingMovie(movie); setIsWatchModalOpen(true); };
  const saveWatchLog = (movieId: string, entry: WatchLogEntry) => setWatchLog((prev) => ({ ...prev, [movieId]: entry }));
  const quickLogEpisode = (movie: Movie) => {
    setWatchLog((prev) => {
      const entry = prev[movie.id] ?? emptyWatchLogEntry();
      const used = new Set(entry.watchedEpisodes);
      let next = 1;
      while (used.has(next)) next += 1;
      return { ...prev, [movie.id]: { ...entry, watchedDate: new Date().toISOString().slice(0, 10), watchedEpisodes: [...entry.watchedEpisodes, next].sort((a, b) => a - b) } };
    });
  };

  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return movies.filter((movie) => {
      if (currentFilter !== 'All' && movie.type !== currentFilter) return false;
      if (selectedGenres.length && !selectedGenres.some((genre) => movie.genres.some((item) => item.toLowerCase().includes(genre.toLowerCase())))) return false;
      return !query || movie.title.toLowerCase().includes(query);
    }).sort((a, b) => sortMode === 'recent'
      ? new Date(watchLog[b.id]?.watchedDate || b.created_at).getTime() - new Date(watchLog[a.id]?.watchedDate || a.created_at).getTime()
      : a.title.localeCompare(b.title));
  }, [movies, currentFilter, selectedGenres, searchQuery, sortMode, watchLog]);

  const recentlyLogged = [...filteredMovies].sort((a, b) =>
    new Date(watchLog[b.id]?.watchedDate || b.created_at).getTime() - new Date(watchLog[a.id]?.watchedDate || a.created_at).getTime()
  ).slice(0, 6);
  const diaryItems = movies.filter((movie) => watchLog[movie.id]?.watchedDate)
    .sort((a, b) => new Date(watchLog[b.id].watchedDate).getTime() - new Date(watchLog[a.id].watchedDate).getTime());
  const watchlistItems = movies.filter((movie) => !watchLog[movie.id]?.watchedDate);
  const showGenres = ['Dashboard', 'Movies', 'TV Series'].includes(activeView);

  return (
    <div className="watch-app">
      {activeView !== 'Dashboard' && <Sidebar activeView={activeView} isOpen={isSidebarOpen} onViewChange={handlePageChange} onLogWatch={() => openWatchLog()} onClose={() => setIsSidebarOpen(false)} />}
      <div className="app-main" style={activeView === 'Dashboard' ? { marginLeft: 0 } : {}}>
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddClick={() => setIsAddModalOpen(true)} onMenuClick={() => setIsSidebarOpen(true)}>
          <div className="filter-toolbar">
            <Navigation currentFilter={currentFilter} onFilterChange={setCurrentFilter} />
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="clear-filter"><X className="h-3.5 w-3.5" /> Clear filters</button>}
          </div>
        </Header>

        <main className="page-content">
          <div className="page-intro">
            <div><p className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> YOUR PERSONAL CINEMA</p><h1>{activeView === 'Dashboard' ? 'Your watch log' : activeView}</h1><p className="page-subtitle">{activeView === 'Dashboard' ? 'A little home for every story you’ve watched.' : viewSubtitle(activeView)}</p></div>
            <div className="intro-actions"><div className="date-chip"><CalendarDays className="h-4 w-4" /> {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</div><button type="button" className="import-cta" onClick={() => setIsImportModalOpen(true)}><FileUp className="h-4 w-4" /> Import CSV</button></div>
          </div>

          {showGenres && <div className="genre-toolbar"><span className="genre-label">GENRES</span><GenreFilters movies={movies} selectedGenres={selectedGenres} onGenreToggle={handleGenreToggle} /></div>}

          {activeView === 'Dashboard' && <>
            <NetflixHero
              movie={recentlyLogged[0] || movies[0]}
              onEdit={() => recentlyLogged[0] && handleMovieEdit(recentlyLogged[0])}
            />
            <NetflixSwimlane
              title="Recently Logged"
              movies={recentlyLogged}
              onCardClick={setSelectedNetflixMovie}
            />
            <NetflixSwimlane
              title="5-Star Masterpieces"
              movies={movies.filter(m => (watchLog[m.id]?.rating || 0) >= 5)}
              onCardClick={setSelectedNetflixMovie}
            />
            <NetflixSwimlane
              title="Completed TV Series"
              movies={movies.filter(m => m.type === 'TV Series' && watchLog[m.id]?.watchedDate)}
              onCardClick={setSelectedNetflixMovie}
            />
            <NetflixSwimlane
              title="Movies Watched This Month"
              movies={movies.filter(m => {
                const watchDate = watchLog[m.id]?.watchedDate;
                if (!watchDate) return false;
                const date = new Date(watchDate);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              })}
              onCardClick={setSelectedNetflixMovie}
            />
            <NetflixSwimlane
              title="Up Next (Watchlist)"
              movies={watchlistItems}
              onCardClick={setSelectedNetflixMovie}
            />
          </>}

          {(activeView === 'Movies' || activeView === 'TV Series') && <section className="collection-section">
            <div className="collection-toolbar"><div><h2>{activeView}</h2><p>{filteredMovies.length} {filteredMovies.length === 1 ? 'title' : 'titles'} in your library</p></div><div className="collection-controls"><div className="segmented-control" role="group" aria-label="Sort titles"><button type="button" onClick={() => setSortMode('az')} aria-pressed={sortMode === 'az'}><ArrowUpAZ className="h-4 w-4" /> A–Z</button><button type="button" onClick={() => setSortMode('recent')} aria-pressed={sortMode === 'recent'}><Clock3 className="h-4 w-4" /> Recent</button></div><div className="segmented-control view-control" role="group" aria-label="View mode"><button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="List view"><List className="h-4 w-4" /></button></div></div></div>
            {loading ? <SkeletonGrid view={viewMode} /> : <PosterGrid movies={filteredMovies} view={viewMode} isEmptyCollection={movies.length === 0} hasActiveFilters={hasActiveFilters} onAddClick={() => setIsAddModalOpen(true)} onMovieEdit={handleMovieEdit} onMovieDelete={(movie) => void handleMovieDelete(movie)} onMovieOpen={openWatchLog} watchLog={watchLog} />}
          </section>}

          {activeView === 'Diary Timeline' && <section className="timeline-panel">{diaryItems.length ? diaryItems.map((movie) => <button type="button" key={movie.id} className="timeline-entry" onClick={() => openWatchLog(movie)}><time>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(watchLog[movie.id].watchedDate))}</time><span className="timeline-dot" /><span className="timeline-title">{movie.title}</span><span className="timeline-type">{movie.type === 'TV Series' ? `${watchLog[movie.id].watchedEpisodes.length} episodes` : watchLog[movie.id].rewatch ? 'Rewatch' : 'First watch'}</span></button>) : <div className="empty-panel"><CalendarDays /><h2>Your diary starts here</h2><p>Log a watch to add your first entry to the timeline.</p><button type="button" className="amber-button" onClick={() => openWatchLog()}><Plus className="h-4 w-4" /> Log a watch</button></div>}</section>}

          {activeView === 'Watchlist' && <section className="collection-section"><div className="collection-toolbar"><div><h2>Up next</h2><p>Titles in your library without a watch log</p></div></div>{watchlistItems.length ? <PosterGrid movies={watchlistItems} view="grid" isEmptyCollection={false} hasActiveFilters={false} onAddClick={() => setIsAddModalOpen(true)} onMovieEdit={handleMovieEdit} onMovieDelete={(movie) => void handleMovieDelete(movie)} onMovieOpen={openWatchLog} watchLog={watchLog} /> : <div className="empty-panel"><Clapperboard /><h2>Your watchlist is clear</h2><p>Add titles you’re excited to watch next.</p><button type="button" className="amber-button" onClick={() => setIsAddModalOpen(true)}><Plus className="h-4 w-4" /> Add a title</button></div>}</section>}

          {activeView === 'Analytics' && <Analytics movies={movies} watchLog={watchLog} />}
        </main>

        <footer className="app-footer">Watchlog · Your personal cinema <span>Data and images provided by TMDB.</span></footer>
      </div>

      {showBackToTop && <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ArrowDown className="h-4 w-4 rotate-180" /></button>}

      <AddTitleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onTitleAdded={handleTitleAdded} />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportComplete={loadMovies} />
      <WatchLogModal isOpen={isWatchModalOpen} movies={movies} initialMovie={watchingMovie} watchLog={watchLog} onClose={() => { setIsWatchModalOpen(false); setWatchingMovie(null); }} onSave={saveWatchLog} onAddTitle={() => { setIsWatchModalOpen(false); setWatchingMovie(null); setIsAddModalOpen(true); }} />
      {editingMovie && <EditModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingMovie(null); }} movie={editingMovie} onMovieUpdated={handleMovieUpdated} />}
      {selectedNetflixMovie && <NetflixDetailModal movie={selectedNetflixMovie} onClose={() => setSelectedNetflixMovie(null)} />}
    </div>
  );
}

function viewSubtitle(view: AppView) {
  switch (view) {
    case 'Movies': return 'Every movie you’ve added to your library.';
    case 'TV Series': return 'Your series collection and episode progress.';
    case 'Diary Timeline': return 'A timeline of the watches you’ve logged.';
    case 'Watchlist': return 'Saved titles waiting for their first watch.';
    case 'Analytics': return 'A closer look at your viewing collection.';
    default: return 'A little home for every story you’ve watched.';
  }
}

function Analytics({ movies, watchLog }: { movies: Movie[]; watchLog: WatchLogMap }) {
  const genres = new Map<string, number>();
  movies.forEach((movie) => movie.genres.forEach((genre) => genres.set(genre, (genres.get(genre) ?? 0) + 1)));
  const sortedGenres = [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const highest = Math.max(1, ...sortedGenres.map(([, count]) => count));
  const rated = Object.values(watchLog).filter((item) => item.rating > 0);
  const averageRating = rated.length ? (rated.reduce((sum, item) => sum + item.rating, 0) / rated.length).toFixed(1) : '—';
  return <section className="analytics-grid"><article className="analytics-card"><p className="section-kicker">COLLECTION MIX</p><h2>Top genres</h2><div className="genre-chart">{sortedGenres.map(([genre, count]) => <div className="genre-bar-row" key={genre}><span>{genre}</span><div className="genre-bar-track"><span style={{ width: `${(count / highest) * 100}%` }} /></div><b>{count}</b></div>)}</div>{!sortedGenres.length && <p className="muted-copy">Add titles to see genre insights.</p>}</article><article className="analytics-card rating-summary"><p className="section-kicker">YOUR RATINGS</p><h2>Average rating</h2><strong>{averageRating}<span>/ 5</span></strong><p>{rated.length ? `${rated.length} titles rated` : 'Ratings appear here after you log a watch.'}</p></article><article className="analytics-card rating-summary"><p className="section-kicker">WATCH ACTIVITY</p><h2>Logged episodes</h2><strong>{Object.values(watchLog).reduce((sum, item) => sum + item.watchedEpisodes.length, 0)}</strong><p>TV episodes checked off in your library</p></article></section>;
}
