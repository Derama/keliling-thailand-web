import {
  FORMAT_SIZES,
  type JourneyData,
  type JourneyStyleId,
  type PostFormat,
} from "@/lib/admin/instagram";
import { Logo } from "@/components/admin/instagram/parts";

function logoData(data: JourneyData) {
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

type SlideProps = {
  data: JourneyData;
  format: PostFormat;
  /** -1 = cover slide, otherwise index into data.slides. */
  slideIndex: number;
};

/** J1 — full-bleed photo with brand gradient overlay. */
function JourneyJ1({ data, format, slideIndex }: SlideProps) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  const isCover = slideIndex < 0;
  const slide = isCover ? null : data.slides[slideIndex];
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
      <Photo url={isCover ? data.coverPhotoUrl : slide?.photoUrl ?? ""} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${navy}f2 0%, ${navy}80 30%, transparent 55%)`,
        }}
      />
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={logoData(data)} />
      </div>
      {isCover ? (
        <div style={{ position: "absolute", bottom: 0, padding: 56, width: "100%" }}>
          <span
            style={{
              display: "inline-block",
              background: yellow,
              color: navy,
              fontWeight: 800,
              fontSize: 26,
              padding: "8px 22px",
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            TRIP STORY
          </span>
          <p style={{ fontSize: 76, lineHeight: 1.1, fontWeight: 800, margin: 0 }}>
            {data.title}
          </p>
          {data.customerName && (
            <p style={{ fontSize: 32, opacity: 0.9, margin: "16px 0 0" }}>
              Perjalanan {data.customerName}
            </p>
          )}
          <p style={{ fontSize: 28, opacity: 0.75, margin: "26px 0 0" }}>
            Geser untuk lihat perjalanannya →
          </p>
        </div>
      ) : (
        <div style={{ position: "absolute", bottom: 0, padding: 56, width: "100%" }}>
          <span
            style={{
              display: "inline-block",
              background: yellow,
              color: navy,
              fontWeight: 800,
              fontSize: 30,
              padding: "10px 26px",
              borderRadius: 999,
              marginBottom: 18,
            }}
          >
            {slide?.label}
          </span>
          <p style={{ fontSize: 46, lineHeight: 1.25, fontWeight: 700, margin: 0 }}>
            {slide?.text}
          </p>
          <p style={{ fontSize: 26, opacity: 0.7, margin: "22px 0 0" }}>
            {data.title} · {slideIndex + 1}/{data.slides.length}
          </p>
        </div>
      )}
    </div>
  );
}

/** J2 — framed card style: photo on top, white caption card below. */
function JourneyJ2({ data, format, slideIndex }: SlideProps) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  const isCover = slideIndex < 0;
  const slide = isCover ? null : data.slides[slideIndex];
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        background: navy,
        display: "flex",
        flexDirection: "column",
        padding: 36,
        boxSizing: "border-box",
        gap: 28,
      }}
    >
      <div style={{ position: "relative", flex: 1, overflow: "hidden", borderRadius: 24 }}>
        <Photo url={isCover ? data.coverPhotoUrl : slide?.photoUrl ?? ""} />
        <div style={{ position: "absolute", top: 28, left: 28 }}>
          <Logo data={logoData(data)} />
        </div>
        {!isCover && (
          <span
            style={{
              position: "absolute",
              top: 32,
              right: 32,
              background: yellow,
              color: navy,
              fontWeight: 800,
              fontSize: 30,
              padding: "10px 26px",
              borderRadius: 999,
            }}
          >
            {slide?.label}
          </span>
        )}
      </div>
      <div
        style={{
          background: "#fff",
          color: navy,
          borderRadius: 20,
          padding: "34px 40px",
        }}
      >
        {isCover ? (
          <>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#8a93a6", margin: 0, letterSpacing: 2 }}>
              TRIP STORY
            </p>
            <p style={{ fontSize: 54, lineHeight: 1.12, fontWeight: 800, margin: "8px 0 0" }}>
              {data.title}
            </p>
            <p style={{ fontSize: 26, opacity: 0.7, margin: "10px 0 0" }}>
              {data.customerName ? `Perjalanan ${data.customerName} · ` : ""}Geser →
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 40, lineHeight: 1.2, fontWeight: 700, margin: 0 }}>
              {slide?.text}
            </p>
            <p style={{ fontSize: 24, opacity: 0.6, margin: "10px 0 0" }}>
              {data.title} · {slideIndex + 1}/{data.slides.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** J3 — polaroid scrapbook: tilted photo card on navy, caption below. */
function JourneyJ3({ data, format, slideIndex }: SlideProps) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  const isCover = slideIndex < 0;
  const slide = isCover ? null : data.slides[slideIndex];
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        background: navy,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 56,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={logoData(data)} />
      </div>
      <div
        style={{
          position: "relative",
          background: "#fff",
          padding: "20px 20px 56px",
          borderRadius: 10,
          transform: `rotate(${slideIndex % 2 === 0 ? -2.5 : 2.5}deg)`,
          boxShadow: "0 24px 60px rgba(0,0,0,.4)",
          width: "74%",
        }}
      >
        <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 4, overflow: "hidden", background: "#0f1422" }}>
          <Photo url={isCover ? data.coverPhotoUrl : slide?.photoUrl ?? ""} />
        </div>
        <span
          style={{
            position: "absolute",
            top: -22,
            right: 36,
            background: yellow,
            color: navy,
            fontWeight: 800,
            fontSize: 26,
            padding: "8px 24px",
            borderRadius: 999,
            transform: "rotate(3deg)",
          }}
        >
          {isCover ? "TRIP STORY" : slide?.label}
        </span>
      </div>
      <div style={{ marginTop: 48, textAlign: "center", maxWidth: "88%" }}>
        {isCover ? (
          <>
            <p style={{ fontSize: 58, lineHeight: 1.15, fontWeight: 800, margin: 0 }}>
              {data.title}
            </p>
            <p style={{ fontSize: 28, opacity: 0.8, margin: "16px 0 0" }}>
              {data.customerName ? `Perjalanan ${data.customerName} · ` : ""}Geser →
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 42, lineHeight: 1.25, fontWeight: 700, margin: 0 }}>
              {slide?.text}
            </p>
            <p style={{ fontSize: 25, opacity: 0.65, margin: "16px 0 0" }}>
              {data.title} · {slideIndex + 1}/{data.slides.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** J4 — magazine split: photo top, white panel with yellow rule + big counter. */
function JourneyJ4({ data, format, slideIndex }: SlideProps) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  const isCover = slideIndex < 0;
  const slide = isCover ? null : data.slides[slideIndex];
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", height: "58%" }}>
        <Photo url={isCover ? data.coverPhotoUrl : slide?.photoUrl ?? ""} />
        <div style={{ position: "absolute", top: 40, left: 40 }}>
          <Logo data={logoData(data)} />
        </div>
      </div>
      <div
        style={{
          flex: 1,
          color: navy,
          display: "flex",
          gap: 36,
          padding: 52,
          boxSizing: "border-box",
          alignItems: "stretch",
        }}
      >
        <div style={{ width: 14, background: yellow, borderRadius: 8, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3, color: "#8a93a6", margin: 0 }}>
            {isCover ? "TRIP STORY" : slide?.label?.toUpperCase()}
          </p>
          <p style={{ fontSize: isCover ? 56 : 42, lineHeight: 1.18, fontWeight: 800, margin: "12px 0 0" }}>
            {isCover ? data.title : slide?.text}
          </p>
          <p style={{ fontSize: 25, opacity: 0.6, margin: "16px 0 0" }}>
            {isCover
              ? `${data.customerName ? `Perjalanan ${data.customerName} · ` : ""}Geser →`
              : `${data.title} · ${slideIndex + 1}/${data.slides.length}`}
          </p>
        </div>
        {!isCover && (
          <p style={{ fontSize: 96, fontWeight: 800, color: `${navy}22`, margin: 0, alignSelf: "center" }}>
            {String(slideIndex + 1).padStart(2, "0")}
          </p>
        )}
      </div>
    </div>
  );
}

export const JOURNEY_STYLES: Record<
  JourneyStyleId,
  { label: string; Component: (props: SlideProps) => React.ReactElement }
> = {
  J1: { label: "Gradient", Component: JourneyJ1 },
  J2: { label: "Kartu", Component: JourneyJ2 },
  J3: { label: "Polaroid", Component: JourneyJ3 },
  J4: { label: "Majalah", Component: JourneyJ4 },
};
