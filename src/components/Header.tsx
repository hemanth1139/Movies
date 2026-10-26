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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchExpanded && window.matchMedia('(hover: none)').matches) searchInputRef.current?.focus();
  }, [isSearchExpanded]);

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
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

  const handleSearchToggle = () => {
    setIsMenuOpen(false);
    setIsSearchExpanded((expanded) => !expanded);
  };
  const expandSearchOnHover = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) setIsSearchExpanded(true);
  };
  const collapseSearchOnMouseLeave = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) setIsSearchExpanded(false);
  };

  return (
    <header className={`netflix-navbar ${isScrolled ? 'scrolled' : ''}`}>
      {isMenuOpen && <button type="button" className="mobile-nav-scrim" aria-label="Close navigation menu" onClick={() => setIsMenuOpen(false)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <button type="button" className="mobile-menu-button" aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen} aria-controls="primary-navigation" onClick={() => setIsMenuOpen((open) => !open)}>
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <h1 className="watchlog-logo"><img src="/watchlog-logo.png?v=2" alt="Watchlog" /></h1>

        <ul id="primary-navigation" className={`netflix-nav-links${isMenuOpen ? ' mobile-menu-open' : ''}`} aria-label="Main navigation">
          {links.map((item) => {
            const Icon = item.icon;
            return <li key={item.view}>
              <button type="button" className={`netflix-nav-link ${activeView === item.view ? 'active' : ''}`} aria-current={activeView === item.view ? 'page' : undefined} onClick={() => { onViewChange(item.view); setIsMenuOpen(false); }}>
                <Icon className="mobile-nav-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </li>;
          })}
        </ul>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          className={`netflix-search-container${isSearchExpanded ? ' search-expanded' : ''}`}
          onMouseEnter={expandSearchOnHover}
          onMouseLeave={collapseSearchOnMouseLeave}
        >
          <button type="button" className="netflix-search-toggle" aria-label="Search titles" aria-expanded={isSearchExpanded} onClick={handleSearchToggle}>
            <Search size={20} aria-hidden="true" />
          </button>
          {isSearchExpanded && (
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Titles, people, genres"
              className="netflix-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </div>

        <button type="button" onClick={onAddClick} className="netflix-add-button">
          <Plus aria-hidden="true" /><span>Add Title</span>
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
