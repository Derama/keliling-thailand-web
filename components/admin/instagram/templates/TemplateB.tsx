import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateB({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: "#0f1422" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={data} />
      </div>
      <div style={{ position: "absolute", left: 48, right: 48, bottom: 56, background: "#fff", color: data.brandColors.navy, borderRadius: 28, padding: 44, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ height: 10, width: 96, background: data.brandColors.yellow, borderRadius: 6, marginBottom: 22 }} />
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 40, lineHeight: 1.35, fontWeight: 600, margin: "16px 0" }}>"{data.reviewText}"</p>
        <p style={{ fontSize: 28, color: "#64748b" }}>{data.customerName}{data.city ? ` · ${data.city}` : ""}</p>
      </div>
    </div>
  );
}
