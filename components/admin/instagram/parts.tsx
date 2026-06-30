import type { PostData } from "@/lib/admin/instagram";

/** Brand logo chip — uses the uploaded logo, else a text wordmark fallback. */
export function Logo({
  data,
  className = "",
  style,
}: {
  data: PostData;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { logoUrl, brandColors } = data;
  if (logoUrl) {
    return (
      <div
        className={className}
        style={{ display: "flex", alignItems: "center", gap: 16, ...style }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="logo"
          crossOrigin="anonymous"
          style={{ height: 104, width: "auto", objectFit: "contain" }}
        />
        <span
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 2px 8px rgba(0,0,0,.55)",
            lineHeight: 1.1,
          }}
        >
          Keliling Thailand
        </span>
      </div>
    );
  }
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: brandColors.navy,
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 999,
        fontSize: 22,
        fontWeight: 700,
        ...style,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: brandColors.yellow,
        }}
      />
      Keliling Thailand
    </div>
  );
}

/** Star row, filled to `rating` out of 5, in the brand yellow. */
export function Stars({
  rating,
  color,
  size = 28,
}: {
  rating: number;
  color: string;
  size?: number;
}) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span style={{ color, fontSize: size, letterSpacing: 3 }}>
      {"★".repeat(full)}
      <span style={{ opacity: 0.3 }}>{"★".repeat(5 - full)}</span>
    </span>
  );
}
