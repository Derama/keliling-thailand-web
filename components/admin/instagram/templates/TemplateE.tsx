import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateE({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: data.brandColors.navy, color: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "55%", ...(data.photoUrl ? { backgroundImage: `url(${data.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#0f1422" }) }} />
      <div style={{ flex: 1, padding: 56, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 48, lineHeight: 1.3, fontWeight: 700, margin: "20px 0" }}>"{data.reviewText}"</p>
        <p style={{ fontSize: 28, color: data.brandColors.yellow, fontWeight: 700 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
    </div>
  );
}
