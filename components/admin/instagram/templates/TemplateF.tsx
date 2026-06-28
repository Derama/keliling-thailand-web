import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo } from "@/components/admin/instagram/parts";

export default function TemplateF({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: "#0f1422" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
      <div style={{ position: "absolute", bottom: 48, left: 48, right: 160, background: data.brandColors.yellow, color: data.brandColors.navy, borderRadius: 24, padding: "32px 36px" }}>
        <p style={{ fontSize: 38, lineHeight: 1.3, fontWeight: 700 }}>"{data.reviewText}"</p>
        <p style={{ fontSize: 26, marginTop: 12, fontWeight: 700, opacity: 0.75 }}>
          {"★".repeat(Math.max(0, Math.min(5, Math.round(data.rating))))} — {data.customerName}{data.city ? `, ${data.city}` : ""}
        </p>
      </div>
    </div>
  );
}
