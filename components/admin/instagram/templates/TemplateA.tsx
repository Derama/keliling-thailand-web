import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateA({
  data,
  format,
}: {
  data: PostData;
  format: PostFormat;
}) {
  const { w, h } = FORMAT_SIZES[format];
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(10,15,30,.92) 0%, rgba(10,15,30,.5) 35%, transparent 60%)",
        }}
      />
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={data} />
      </div>
      <div style={{ position: "absolute", bottom: 0, padding: 56, width: "100%" }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 44, lineHeight: 1.3, fontWeight: 600, margin: "16px 0" }}>
          {`“${data.reviewText}”`}
        </p>
        <p style={{ fontSize: 30, opacity: 0.85 }}>
          — {data.customerName}
          {data.city ? `, ${data.city}` : ""}
        </p>
      </div>
    </div>
  );
}
