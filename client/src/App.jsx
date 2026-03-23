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
  const [thisDayActive, setThisDayActive] = useState(false);
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
    if (loading || !hasMore || thisDayActive) return;
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
  }, [loading, hasMore, enabledUserIds, thisDayActive]);

  useEffect(() => {
    if (enabledUserIds && enabledUserIds.length > 0) {
      fetchMore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAndFetch = useCallback(() => {
    setThisDayActive(false);
    seenIds.current.clear();
    emptyStreak.current = 0;
    setAssets([]);
    setHasMore(true);
    setTimeout(fetchMore, 0);
  }, [fetchMore]);

  const handleThisDay = useCallback(async () => {
    if (thisDayActive) {
      // Toggle off — go back to random mode
      setThisDayActive(false);
      seenIds.current.clear();
      emptyStreak.current = 0;
      setAssets([]);
      setHasMore(true);
      return;
    }

    setThisDayActive(true);
    setHasMore(false);
    seenIds.current.clear();
    setAssets([]);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (enabledUserIds && enabledUserIds.length > 0) {
        params.set("userIds", enabledUserIds.join(","));
      }
      const res = await fetch(`/api/on-this-day?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setAssets(sortByDate(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thisDayActive, enabledUserIds]);

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
    if (thisDayActive) {
      handleThisDay();
    } else {
      resetAndFetch();
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="app">
      <Header
        onShuffle={resetAndFetch}
        onFilterClick={() => setFilterOpen(!filterOpen)}
        filterOpen={filterOpen}
        onThisDay={handleThisDay}
        thisDayActive={thisDayActive}
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
        {thisDayActive && (
          <div className="this-day-banner">
            On this day — {today}
            {assets.length > 0 && <span className="this-day-count">{assets.length} photos</span>}
          </div>
        )}
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
