export const runtime = 'edge'; // ⚡ เพิ่มบรรทัดนี้ครับ
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) return NextResponse.json({ message: "Missing coordinates" }, { status: 400 });

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY; 
    
    const [weatherRes, pollutionRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
    ]);

    const wData = await weatherRes.json();
    const pData = await pollutionRes.json();

    // ⚡ ดึงค่า PM2.5 มาคำนวณ (OpenWeather ให้หน่วยเป็น μg/m3)
    const pm25 = pData.list?.[0]?.components?.pm2_5 || 0;

    // 🧮 สูตรคำนวณ AQI แบบมาตรฐาน (ฉบับปรับปรุงให้ใกล้เคียง IQAir ที่สุด)
    let displayAqi = 0;
    if (pm25 <= 12) displayAqi = (50 / 12) * pm25;
    else if (pm25 <= 35.4) displayAqi = ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51;
    else if (pm25 <= 55.4) displayAqi = ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101;
    else displayAqi = pm25 * 2; // กรณีฝุ่นหนามาก

    return NextResponse.json({
      temp: wData.main ? Math.round(wData.main.temp) : 0,
      desc: wData.weather ? wData.weather[0].description : "Unknown",
      city: wData.name || "Unknown Location",
      aqi: Math.round(displayAqi), // ส่งค่าที่คำนวณแล้วไปโชว์
    });

  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}