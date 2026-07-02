import {
  FORMAT_SIZES,
  type AttractionData,
  type AttractionTemplateId,
  type PostFormat,
} from "@/lib/admin/instagram";
import { Logo } from "@/components/admin/instagram/parts";

type Props = { data: AttractionData; format: PostFormat };

/** Logo helper expects PostData-ish shape; only logoUrl + brandColors are read. */
function logoData(data: AttractionData) {
  return { logoUrl: data.logoUrl, brandColors: data.brandColors } as Parameters<
    typeof Logo
  >[0]["data"];
}

function Photo({ url }: { url: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

/** P1 — full photo, bottom gradient, big title + yellow date chip. */
function AttractionP1({ data, format }: Props) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        color: "#fff",
        background: "#0f1422",
      }}
    >
      <Photo url={data.photoUrl} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${navy}f2 0%, ${navy}88 32%, transparent 58%)`,
        }}
      />
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={logoData(data)} />
      </div>
      <div style={{ position: "absolute", bottom: 0, padding: 56, width: "100%" }}>
        {data.date && (
          <span
            style={{
              display: "inline-block",
              background: yellow,
              color: navy,
              fontWeight: 800,
              fontSize: 28,
              padding: "10px 26px",
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            {data.date}
          </span>
        )}
        <p style={{ fontSize: 72, lineHeight: 1.1, fontWeight: 800, margin: 0 }}>
          {data.title}
        </p>
        {data.location && (
          <p style={{ fontSize: 34, opacity: 0.9, margin: "14px 0 0" }}>
            📍 {data.location}
          </p>
        )}
        {data.hook && (
          <p style={{ fontSize: 32, lineHeight: 1.35, margin: "20px 0 0", opacity: 0.95 }}>
            {data.hook}
          </p>
        )}
      </div>
    </div>
  );
}

/** P2 — yellow headline band on top, photo below, navy footer with hook. */
function AttractionP2({ data, format }: Props) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        background: navy,
      }}
    >
      <div style={{ background: yellow, color: navy, padding: "44px 56px" }}>
        <p style={{ fontSize: 60, lineHeight: 1.1, fontWeight: 800, margin: 0 }}>
          {data.title}
        </p>
        <p style={{ fontSize: 30, fontWeight: 600, margin: "10px 0 0" }}>
          {[data.location && `📍 ${data.location}`, data.date].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div style={{ position: "relative", flex: 1 }}>
        <Photo url={data.photoUrl} />
      </div>
      <div
        style={{
          background: navy,
          color: "#fff",
          padding: "36px 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <p style={{ fontSize: 30, lineHeight: 1.35, margin: 0, flex: 1 }}>{data.hook}</p>
        <Logo data={logoData(data)} />
      </div>
    </div>
  );
}

/** P3 — photo in navy frame, floating white event card at the bottom. */
function AttractionP3({ data, format }: Props) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        background: navy,
        padding: 36,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 24 }}>
        <Photo url={data.photoUrl} />
        <div style={{ position: "absolute", top: 32, left: 32 }}>
          <Logo data={logoData(data)} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            bottom: 40,
            background: "#fff",
            color: navy,
            borderRadius: 20,
            padding: "36px 40px",
            boxShadow: "0 12px 40px rgba(0,0,0,.35)",
          }}
        >
          {data.date && (
            <span
              style={{
                display: "inline-block",
                background: yellow,
                color: navy,
                fontWeight: 800,
                fontSize: 24,
                padding: "6px 18px",
                borderRadius: 999,
                marginBottom: 14,
              }}
            >
              {data.date}
            </span>
          )}
          <p style={{ fontSize: 48, lineHeight: 1.15, fontWeight: 800, margin: 0 }}>
            {data.title}
          </p>
          <p style={{ fontSize: 26, opacity: 0.75, margin: "10px 0 0" }}>
            {[data.location && `📍 ${data.location}`, data.hook].filter(Boolean).join(" — ")}
          </p>
        </div>
      </div>
    </div>
  );
}

export const ATTRACTION_TEMPLATES: Record<
  AttractionTemplateId,
  { label: string; Component: (props: Props) => React.ReactElement }
> = {
  P1: { label: "Poster gradient", Component: AttractionP1 },
  P2: { label: "Banner kuning", Component: AttractionP2 },
  P3: { label: "Kartu event", Component: AttractionP3 },
};
