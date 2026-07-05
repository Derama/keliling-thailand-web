import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateG({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: navy, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 56, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
      <div style={{ background: "#fff", padding: "22px 22px 60px", borderRadius: 10, transform: "rotate(-2.5deg)", boxShadow: "0 24px 60px rgba(0,0,0,.4)", width: "72%" }}>
        <div style={{ aspectRatio: "1 / 1", borderRadius: 4, ...(data.photoUrl ? { backgroundImage: `url(${data.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#0f1422" }) }} />
      </div>
      <div style={{ marginTop: 52, textAlign: "center", maxWidth: "88%" }}>
        <Stars rating={data.rating} color={yellow} />
        <p style={{ fontSize: 40, lineHeight: 1.35, fontWeight: 600, margin: "18px 0" }}>{`“${data.reviewText}”`}</p>
        <p style={{ fontSize: 28, color: yellow, fontWeight: 700 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
    </div>
  );
}
