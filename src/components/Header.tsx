import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { AppView } from './Sidebar';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const links: Array<{ label: string; view: AppView }> = [
  { label: 'Home', view: 'Home' },
  { label: 'Movies', view: 'Movies' },
  { label: 'Series', view: 'Series' },
  { label: 'Anime', view: 'Anime' },
  { label: 'Logbook', view: 'Logbook' },
];

export default function Header({ searchQuery, onSearchChange, onAddClick, activeView, onViewChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector(activeView === 'Logbook' ? '.vault-search-input' : '.netflix-search-input') as HTMLInputElement;
        if (activeView !== 'Logbook') setIsSearchExpanded(true);
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

  return (
    <header className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <h1 className="watchlog-logo"><img src="/watchlog-logo.png" alt="Watchlog" /></h1>

        <ul className="netflix-nav-links" aria-label="Main navigation">
          {links.map((item) => (
            <li key={item.view}>
              <button type="button" className={`netflix-nav-link ${activeView === item.view ? 'active' : ''}`} aria-current={activeView === item.view ? 'page' : undefined} onClick={() => onViewChange(item.view)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          className="netflix-search-container"
          onMouseEnter={() => setIsSearchExpanded(true)}
          onMouseLeave={() => setIsSearchExpanded(false)}
        >
          <Search size={20} color="#B3B3B3" />
          {isSearchExpanded && (
            <input
              type="text"
              placeholder="Titles, people, genres"
              className="netflix-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </div>

        <button onClick={onAddClick} className="netflix-add-button">
          + Log Watched
        </button>

        <div className="netflix-avatar">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
            alt="User"
          />
        </div>
      </div>
    </header>
  );
}
