import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, CalendarDays, Clapperboard, Sparkles, X } from 'lucide-react';
import Header from './components/Header';
import type { AppView } from './components/Sidebar';
import Sidebar from './components/Sidebar';
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
import { emptyWatchLogEntry, type WatchLogMap } from './types/watchLog';

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
  const [activeView, setActiveView] = useState<AppView>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [watchingMovie, setWatchingMovie] = useState<Movie | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [watchLog, setWatchLog] = useState<WatchLogMap>(loadWatchLog);
  const [selectedNetflixMovie, setSelectedNetflixMovie] = useState<Movie | null>(null);

  useEffect(() => { void loadMovies(); }, []);
  useEffect(() => {
    try { window.localStorage.setItem(WATCH_LOG_STORAGE_KEY, JSON.stringify(watchLog)); } catch { /* Storage may be disabled. */ }
  }, [watchLog]);

  const loadMovies = async () => {
    setLoading(true);
    const data = await getMovies();
    setMovies(data);
    setLoading(false);
  };

  const handleTitleAdded = (movie: Movie) => setMovies((prev) => [...prev, movie]);
  const handleMovieEdit = (movie: Movie) => { setEditingMovie(movie); setIsEditModalOpen(true); };
  const handleMovieUpdated = (updatedMovie: Movie) => setMovies((prev) => prev.map((item) => item.id === updatedMovie.id ? updatedMovie : item));
  const handleMovieDelete = async (movie: Movie) => {
    if (!supabase) { setMovies((prev) => prev.filter((item) => item.id !== movie.id)); return; }
    if (await deleteMovie(movie.id)) setMovies((prev) => prev.filter((item) => item.id !== movie.id));
  };
  const handlePageChange = (view: AppView) => setActiveView(view);
  const openWatchLog = (movie: Movie | null = null) => { setWatchingMovie(movie); setIsWatchModalOpen(true); };
  const saveWatchLog = (movieId: string, entry: any) => setWatchLog((prev) => ({ ...prev, [movieId]: entry }));

  const recentlyLogged = [...movies].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 10);
  const diaryItems = movies.filter((movie) => watchLog[movie.id]?.watchedDate)
    .sort((a, b) => new Date(watchLog[b.id].watchedDate).getTime() - new Date(watchLog[a.id].watchedDate).getTime());
  const watchlistItems = movies.filter((movie) => !watchLog[movie.id]?.watchedDate);

  return (
    <div className="watch-app">
      {activeView === 'Dashboard' ? (
        <>
          <Header
            searchQuery=""
            onSearchChange={() => {}}
            onAddClick={() => setIsAddModalOpen(true)}
            onMenuClick={() => {}}
          />

          {recentlyLogged.length > 0 && (
            <NetflixHero
              movie={recentlyLogged[0]}
              onEdit={() => handleMovieEdit(recentlyLogged[0])}
            />
          )}

          <div style={{ paddingBottom: '60px' }}>
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
          </div>

          {selectedNetflixMovie && (
            <NetflixDetailModal
              movie={selectedNetflixMovie}
              onClose={() => setSelectedNetflixMovie(null)}
            />
          )}
        </>
      ) : (
        <>
          <Sidebar activeView={activeView} isOpen={isSidebarOpen} onViewChange={handlePageChange} onLogWatch={() => openWatchLog()} onClose={() => setIsSidebarOpen(false)} />
          <div className="app-main">
            <Header
              searchQuery=""
              onSearchChange={() => {}}
              onAddClick={() => setIsAddModalOpen(true)}
              onMenuClick={() => setIsSidebarOpen(true)}
            >
              <div className="filter-toolbar">
                <p style={{ color: '#B3B3B3', fontSize: '14px' }}>Use the Dashboard view for Netflix-style browsing</p>
              </div>
            </Header>

            <main className="page-content">
              <div className="page-intro">
                <div><p className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> YOUR PERSONAL CINEMA</p><h1>{activeView}</h1></div>
              </div>

              <div style={{ padding: '40px 4%' }}>
                <p style={{ color: '#B3B3B3', fontSize: '16px' }}>
                  Switch to Dashboard view to see the Netflix-style interface with hero billboards and horizontal carousels.
                </p>
              </div>
            </main>
          </div>
        </>
      )}

      <AddTitleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onTitleAdded={handleTitleAdded} />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportComplete={loadMovies} />
      <WatchLogModal isOpen={isWatchModalOpen} movies={movies} initialMovie={watchingMovie} watchLog={watchLog} onClose={() => { setIsWatchModalOpen(false); setWatchingMovie(null); }} onSave={saveWatchLog} onAddTitle={() => { setIsWatchModalOpen(false); setWatchingMovie(null); setIsAddModalOpen(true); }} />
      {editingMovie && <EditModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingMovie(null); }} movie={editingMovie} onMovieUpdated={handleMovieUpdated} />}
    </div>
  );
}
