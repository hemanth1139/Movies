import { Film, Home, Plus, Sparkles, Tv, X, BookOpen } from 'lucide-react';

export type AppView = 'Home' | 'Movies' | 'Series' | 'Anime' | 'Logbook';

interface SidebarProps {
  activeView: AppView;
  isOpen: boolean;
  onViewChange: (view: AppView) => void;
  onLogWatch: () => void;
  onClose: () => void;
}

const links: Array<{ label: AppView; icon: typeof Home }> = [
  { label: 'Home', icon: Home },
  { label: 'Movies', icon: Film },
  { label: 'Series', icon: Tv },
  { label: 'Anime', icon: Sparkles },
  { label: 'Logbook', icon: BookOpen },
];

export default function Sidebar({ activeView, isOpen, onViewChange, onLogWatch, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <img className="sidebar-logo-image" src="/watchlog-logo.png?v=2" alt="Watchlog" />
          <button type="button" className="sidebar-close icon-button" onClick={onClose} aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>

        <p className="sidebar-label">YOUR SPACE</p>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {links.map(({ label, icon: Icon }) => (
            <button key={label} type="button" onClick={() => { onViewChange(label); onClose(); }} className={`sidebar-link ${activeView === label ? 'sidebar-link-active' : ''}`} aria-current={activeView === label ? 'page' : undefined}>
              <Icon className="h-[18px] w-[18px]" /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-dot" /><span>Keep your watch history in one place.</span></div>
          <button type="button" onClick={onLogWatch} className="amber-button sidebar-cta"><Plus className="h-[18px] w-[18px]" /> Log Watch</button>
          <div className="sidebar-profile"><div className="avatar">W</div><div><strong>My Watchlog</strong><span>Personal library</span></div></div>
        </div>
      </aside>
    </>
  );
}
