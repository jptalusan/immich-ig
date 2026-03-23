import "./Header.css";

function Header({ onShuffle, onFilterClick, filterOpen }) {
  return (
    <header className="header">
      <div className="header-inner">
        <h1 className="header-title">Immich Gallery</h1>
        <div className="header-actions">
          <button
            className={`header-btn ${filterOpen ? "active" : ""}`}
            onClick={onFilterClick}
            title="Filter users"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
          </button>
          <button className="header-btn" onClick={onShuffle} title="Shuffle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
