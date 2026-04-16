import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, whatsapp, service, vehicle, date, pax, pickup, dropoff, notes } = body;

  if (!name || !whatsapp || !service || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("bookings").insert({
    name,
    whatsapp,
    service,
    vehicle: vehicle || null,
    date,
    pax: Number(pax) || 1,
    pickup: pickup || null,
    dropoff: dropoff || null,
    notes: notes || null,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to save booking" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
