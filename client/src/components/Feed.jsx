import { useEffect, useRef } from "react";
import PostCard from "./PostCard";
import "./Feed.css";

function Feed({ assets, onLoadMore, loading, hasMore, onImageClick }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  return (
    <div className="feed">
      {assets.map((asset) => (
        <PostCard key={asset.id} asset={asset} onImageClick={onImageClick} />
      ))}

      <div ref={sentinelRef} className="sentinel">
        {loading && <div className="loading-spinner" />}
        {!hasMore && assets.length > 0 && (
          <div className="feed-end">No more photos to load</div>
        )}
      </div>
    </div>
  );
}

export default Feed;
