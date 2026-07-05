import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateI({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  const { navy, yellow } = data.brandColors;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: "#0f1422" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      {/* Side panel keeps the photo's right half visible in every format. */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "52%", background: `${navy}f0`, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 52, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 12, background: yellow }} />
        <Stars rating={data.rating} color={yellow} />
        <p style={{ fontSize: 40, lineHeight: 1.35, fontWeight: 600, margin: "18px 0" }}>{`“${data.reviewText}”`}</p>
        <p style={{ fontSize: 27, color: yellow, fontWeight: 700, margin: 0 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
    </div>
  );
}
