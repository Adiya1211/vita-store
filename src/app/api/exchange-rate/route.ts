import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/AUD", {
      next: { revalidate: 3600 }, // 1 цагт нэг удаа шинэчлэх
    });

    if (!res.ok) throw new Error("fetch failed");

    const data = await res.json();
    return NextResponse.json({
      rate: Math.round(data.rates.MNT),
      date: data.date,
    });
  } catch {
    // Холболт амжилтгүй бол fallback утга
    return NextResponse.json({ rate: 2554, date: null, source: "fallback" });
  }
}
