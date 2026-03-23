import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import Feed from "./components/Feed";
import Lightbox from "./components/Lightbox";
import UserFilter from "./components/UserFilter";
import "./App.css";

function sortByDate(assets) {
  return [...assets].sort(
    (a, b) =>
      new Date(b.fileCreatedAt).getTime() -
      new Date(a.fileCreatedAt).getTime()
  );
}

// Sort only the new batch internally, then append to existing list
function appendSorted(existing, newItems) {
  if (existing.length === 0) return sortByDate(newItems);
  const sortedNew = sortByDate(newItems);
  return [...existing, ...sortedNew];
}

function loadEnabledUsers() {
  try {
    const saved = localStorage.getItem("immich-ig-enabled-users");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveEnabledUsers(enabledIds) {
  localStorage.setItem("immich-ig-enabled-users", JSON.stringify(enabledIds));
}

function App() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lightboxAsset, setLightboxAsset] = useState(null);
  const [users, setUsers] = useState([]);
  const [enabledUserIds, setEnabledUserIds] = useState(loadEnabledUsers);
  const [filterOpen, setFilterOpen] = useState(false);
  const seenIds = useRef(new Set());
  const emptyStreak = useRef(0);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        if (enabledUserIds === null) {
          const allIds = data.map((u) => u.id);
          setEnabledUserIds(allIds);
          saveEnabledUsers(allIds);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ count: "12" });
      if (enabledUserIds && enabledUserIds.length > 0) {
        params.set("userIds", enabledUserIds.join(","));
      }
      const res = await fetch(`/api/random?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const newAssets = data.filter((a) => !seenIds.current.has(a.id));
      newAssets.forEach((a) => seenIds.current.add(a.id));

      if (newAssets.length === 0) {
        emptyStreak.current++;
        if (emptyStreak.current >= 3) {
          setHasMore(false);
        }
      } else {
        emptyStreak.current = 0;
        setAssets((prev) => appendSorted(prev, newAssets));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, enabledUserIds]);

  useEffect(() => {
    if (enabledUserIds && enabledUserIds.length > 0) {
      fetchMore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAndFetch = useCallback(() => {
    seenIds.current.clear();
    emptyStreak.current = 0;
    setAssets([]);
    setHasMore(true);
    setTimeout(fetchMore, 0);
  }, [fetchMore]);

  const handleToggleUser = (userId) => {
    setEnabledUserIds((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      saveEnabledUsers(next);
      return next;
    });
  };

  const handleApplyFilter = () => {
    setFilterOpen(false);
    resetAndFetch();
  };

  return (
    <div className="app">
      <Header
        onShuffle={resetAndFetch}
        onFilterClick={() => setFilterOpen(!filterOpen)}
        filterOpen={filterOpen}
      />
      {filterOpen && (
        <UserFilter
          users={users}
          enabledUserIds={enabledUserIds || []}
          onToggle={handleToggleUser}
          onApply={handleApplyFilter}
        />
      )}
      <main className="main">
        {error && <div className="error">{error}</div>}
        {enabledUserIds && enabledUserIds.length === 0 && (
          <div className="error">No users selected. Open the filter to enable users.</div>
        )}
        <Feed
          assets={assets}
          onLoadMore={fetchMore}
          loading={loading}
          hasMore={hasMore}
          onImageClick={setLightboxAsset}
        />
      </main>
      {lightboxAsset && (
        <Lightbox
          asset={lightboxAsset}
          onClose={() => setLightboxAsset(null)}
        />
      )}
    </div>
  );
}

export default App;
