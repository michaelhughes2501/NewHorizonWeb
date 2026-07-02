import { useEffect } from "react";

const SHIMMER_STYLE_ID = "nh-skeleton-shimmer";

function injectShimmerCSS() {
  if (document.getElementById(SHIMMER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHIMMER_STYLE_ID;
  style.textContent = `
    @keyframes nh-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .nh-skeleton {
      background: linear-gradient(
        90deg,
        #2a2a2a 25%,
        #3a3a3a 50%,
        #2a2a2a 75%
      );
      background-size: 800px 100%;
      animation: nh-shimmer 1.4s ease-in-out infinite;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Single shimmer block.
 * @param {{ width?: string|number, height?: string|number, borderRadius?: string|number }} props
 */
export function Skeleton({ width = "100%", height = 16, borderRadius = 4 }) {
  useEffect(() => { injectShimmerCSS(); }, []);

  return (
    <div
      className="nh-skeleton"
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

/** Preset card skeleton: avatar circle + 3 lines of text. */
export function SkeletonCard() {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "16px",
        borderRadius: 12,
        background: "#1a1a1a",
        width: "100%",
      }}
      aria-busy="true"
      aria-label="Loading content"
    >
      {/* Avatar circle */}
      <Skeleton width={48} height={48} borderRadius="50%" />

      {/* Text lines */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
        <Skeleton width="60%" height={14} borderRadius={4} />
        <Skeleton width="85%" height={12} borderRadius={4} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </div>
    </div>
  );
}

export default Skeleton;
