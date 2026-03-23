import { useEffect, useState } from "react";
import "./Lightbox.css";

function Lightbox({ asset, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const originalUrl = `/api/assets/${asset.id}/original`;

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

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        &times;
      </button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
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
