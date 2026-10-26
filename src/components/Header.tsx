import { useState, useEffect, useRef } from 'react';
import { BookOpen, Film, Home, Menu, Plus, Search, Sparkles, Tv, X } from 'lucide-react';
import type { AppView } from './Sidebar';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const links: Array<{ label: string; view: AppView; icon: typeof Home }> = [
  { label: 'Home', view: 'Home', icon: Home },
  { label: 'Movies', view: 'Movies', icon: Film },
  { label: 'Series', view: 'Series', icon: Tv },
  { label: 'Anime', view: 'Anime', icon: Sparkles },
  { label: 'Logbook', view: 'Logbook', icon: BookOpen },
];

export default function Header({ searchQuery, onSearchChange, onAddClick, activeView, onViewChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery) {
      setIsSearchExpanded(true);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchExpanded) {
      const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
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
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, searchQuery]);

  // Click outside to collapse search if empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isSearchExpanded || searchQuery.trim()) return;
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchExpanded, searchQuery]);

  const handleSearchToggle = () => {
    setIsMenuOpen(false);
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
    } else if (!searchQuery) {
      setIsSearchExpanded(false);
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleSearchClearOrClose = () => {
    if (searchQuery) {
      onSearchChange('');
      searchInputRef.current?.focus();
    } else {
      setIsSearchExpanded(false);
    }
  };

  return (
    <header className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      {isMenuOpen && <button type="button" className="mobile-nav-scrim" aria-label="Close navigation menu" onClick={() => setIsMenuOpen(false)} />}
      <div className="netflix-navbar-left">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => { if (!open) setIsSearchExpanded(false); return !open; })}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <button
          type="button"
          className="watchlog-logo-button"
          aria-label="Go to Watchlog Home"
          onClick={() => {
            onViewChange('Home');
            setIsMenuOpen(false);
          }}
        >
          <img src="/watchlog-logo.png?v=2" alt="Watchlog" />
        </button>

        <ul id="primary-navigation" className={`netflix-nav-links${isMenuOpen ? ' mobile-menu-open' : ''}`} aria-label="Main navigation">
          {links.map((item) => {
            const Icon = item.icon;
            return <li key={item.view}>
              <button
                type="button"
                className={`netflix-nav-link ${activeView === item.view ? 'active' : ''}`}
                aria-current={activeView === item.view ? 'page' : undefined}
                onClick={() => {
                  onViewChange(item.view);
                  setIsMenuOpen(false);
                }}
              >
                <Icon className="mobile-nav-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </li>;
          })}
        </ul>
      </div>

      <div className="netflix-navbar-right">
        <div
          ref={searchContainerRef}
          className={`netflix-search-container${isSearchExpanded ? ' search-expanded' : ''}`}
        >
          <button
            type="button"
            className="netflix-search-toggle"
            aria-label="Search titles"
            aria-expanded={isSearchExpanded}
            onClick={handleSearchToggle}
          >
            <Search size={20} aria-hidden="true" />
          </button>
          {isSearchExpanded && (
            <>
              <input
                type="text"
                ref={searchInputRef}
                placeholder="Search all titles, people, genres…"
                className="netflix-search-input"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search all titles"
              />
              <button
                type="button"
                className="netflix-search-clear"
                aria-label={searchQuery ? 'Clear search' : 'Close search'}
                onClick={handleSearchClearOrClose}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <button type="button" onClick={onAddClick} className="netflix-add-button" aria-label="Add new title to collection">
          <Plus aria-hidden="true" /><span>Add Title</span>
        </button>

        <button
          type="button"
          className="netflix-avatar"
          title="My Watchlog Profile (Logbook)"
          aria-label="View My Watchlog Logbook"
          onClick={() => onViewChange('Logbook')}
        >
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
            alt="User avatar"
          />
        </button>
      </div>
    </header>
  );
}
