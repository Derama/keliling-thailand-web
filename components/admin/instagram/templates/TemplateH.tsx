import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateH({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: navy, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
      <span style={{ fontSize: 200, lineHeight: 0.6, fontWeight: 800, color: yellow, fontFamily: "Georgia, serif" }}>“</span>
      <p style={{ fontSize: 54, lineHeight: 1.3, fontWeight: 700, margin: "28px 0 36px" }}>{data.reviewText}</p>
      <Stars rating={data.rating} color={yellow} size={34} />
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 36 }}>
        <div style={{ width: 132, height: 132, borderRadius: "50%", border: `6px solid ${yellow}`, flexShrink: 0, ...(data.photoUrl ? { backgroundImage: `url(${data.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#0f1422" }) }} />
        <div>
          <p style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>{data.customerName}</p>
          {data.city && <p style={{ fontSize: 26, opacity: 0.7, margin: "6px 0 0" }}>{data.city}</p>}
        </div>
      </div>
    </div>
  );
}
