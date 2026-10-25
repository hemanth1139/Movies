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

const links: AppView[] = ['Home', 'Movies', 'Series', 'Anime'];

export default function Header({ searchQuery, onSearchChange, onAddClick, activeView, onViewChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <h1 className="netflix-logo">WATCHLOG</h1>

        <ul className="netflix-nav-links" aria-label="Main navigation">
          {links.map((item) => (
            <li key={item}>
              <button type="button" className={`netflix-nav-link ${activeView === item ? 'active' : ''}`} aria-current={activeView === item ? 'page' : undefined} onClick={() => onViewChange(item)}>
                {item}
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
