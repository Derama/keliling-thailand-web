import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateC({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: data.brandColors.navy, color: "#fff", display: "flex", flexDirection: "column", padding: 44, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 28 }}><Logo data={data} /></div>
      <div style={{ flex: 1, borderRadius: 24, ...(data.photoUrl ? { backgroundImage: `url(${data.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#0f1422" }) }} />
      <div style={{ paddingTop: 32 }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 38, lineHeight: 1.35, fontWeight: 600, margin: "14px 0 8px" }}>{`“${data.reviewText}”`}</p>
        <p style={{ fontSize: 28, color: data.brandColors.yellow, fontWeight: 700 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
    </div>
  );
}
