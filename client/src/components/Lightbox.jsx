import { useEffect, useState, useRef, useCallback } from "react";
import "./Lightbox.css";

function Lightbox({ asset, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const originalUrl = `/api/assets/${asset.id}/original`;

  // Swipe-to-dismiss state
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Pinch-to-zoom state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPinching = useRef(false);
  const initialPinchDist = useRef(0);
  const initialScale = useRef(1);
  const lastPanX = useRef(0);
  const lastPanY = useRef(0);
  const pinchMidX = useRef(0);
  const pinchMidY = useRef(0);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const getTouchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start
      isPinching.current = true;
      setIsDragging(false);
      initialPinchDist.current = getTouchDist(e.touches);
      initialScale.current = scale;
      pinchMidX.current =
        (e.touches[0].clientX + e.touches[1].clientX) / 2;
      pinchMidY.current =
        (e.touches[0].clientY + e.touches[1].clientY) / 2;
      lastPanX.current = panX;
      lastPanY.current = panY;
    } else if (e.touches.length === 1 && scale <= 1) {
      // Single finger swipe (only when not zoomed)
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const newScale = Math.max(
        1,
        Math.min(5, initialScale.current * (dist / initialPinchDist.current))
      );
      setScale(newScale);

      // Pan with pinch midpoint
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setPanX(lastPanX.current + midX - pinchMidX.current);
      setPanY(lastPanY.current + midY - pinchMidY.current);
    } else if (e.touches.length === 1 && isDragging && scale <= 1) {
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        setTranslateY(diff);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (isPinching.current && e.touches.length < 2) {
      isPinching.current = false;
      // Snap back to 1x if close
      if (scale < 1.1) {
        resetZoom();
      }
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      if (translateY > 120) {
        onClose();
      } else {
        setTranslateY(0);
      }
    }
  };

  const opacity = Math.max(0.2, 1 - translateY / 400);

  const contentTransform =
    scale > 1
      ? `translate(${panX}px, ${panY}px) scale(${scale})`
      : `translateY(${translateY}px)`;

  return (
    <div
      className="lightbox-overlay"
      onClick={scale > 1 ? resetZoom : onClose}
      style={{ background: `rgba(0, 0, 0, ${opacity * 0.9})` }}
    >
      <button className="lightbox-close" onClick={onClose}>
        &times;
      </button>
      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: contentTransform,
          transition: isDragging || isPinching.current
            ? "none"
            : "transform 0.25s ease",
        }}
      >
        {!loaded && (
          <div className="lightbox-spinner-wrapper">
            <div className="lightbox-spinner" />
          </div>
        )}
        <img
          className={`lightbox-image ${loaded ? "visible" : ""}`}
          src={originalUrl}
          alt={asset.originalFileName || "Photo"}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

export default Lightbox;
