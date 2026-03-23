import { useState } from "react";
import "./PostCard.css";

function PostCard({ asset, onImageClick }) {
  const [loaded, setLoaded] = useState(false);

  const thumbnailUrl = `/api/assets/${asset.id}/thumbnail?size=thumbnail`;

  const fileDate = asset.fileCreatedAt ? new Date(asset.fileCreatedAt) : null;

  const dateStr = fileDate
    ? fileDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const exif = asset.exifInfo;
  const location =
    exif?.city && exif?.state
      ? `${exif.city}, ${exif.state}`
      : exif?.city || exif?.state || null;

  const camera =
    exif?.make && exif?.model
      ? `${exif.make} ${exif.model}`
      : exif?.model || null;

  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-header-left">
          {asset.ownerName && (
            <span className="post-owner">{asset.ownerName}</span>
          )}
          {location && <span className="post-location">{location}</span>}
        </div>
        {dateStr && (
          <div className="post-header-right">
            <span className="post-date">{dateStr}</span>
            {asset.immichUrl && (
              <a
                className="post-view-day"
                href={asset.immichUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                View this day
              </a>
            )}
          </div>
        )}
      </div>

      <div className="post-image-container" onClick={() => onImageClick(asset)}>
        {!loaded && <div className="post-image-placeholder" />}
        <img
          className={`post-image ${loaded ? "visible" : ""}`}
          src={thumbnailUrl}
          alt={asset.originalFileName || "Photo"}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <div className="post-footer">
        <span className="post-filename">{asset.originalFileName}</span>
        {camera && <span className="post-camera">{camera}</span>}
      </div>
    </article>
  );
}

export default PostCard;
