// THB -> IDR rate from a free, keyless API. Cached ~1h server-side.
export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/THB", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.IDR;
    if (typeof rate !== "number") throw new Error("no IDR rate in response");
    return Response.json({ rate });
  } catch {
    return Response.json({ rate: null }, { status: 502 });
  }
}
