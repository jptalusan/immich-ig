import { useEffect, useState, useRef } from "react";
import "./Lightbox.css";

function Lightbox({ asset, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const originalUrl = `/api/assets/${asset.id}/original`;

  // Swipe-to-dismiss state
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

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

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    // Only allow downward swipe
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateY > 120) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  const opacity = Math.max(0.2, 1 - translateY / 400);

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
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
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease",
        }}
      >
        {!loaded && <div className="lightbox-spinner" />}
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
