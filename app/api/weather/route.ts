export const runtime = "edge";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        { message: "Missing coordinates" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { message: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "API key missing" },
        { status: 500 }
      );
    }

    /* =========================
       Fetch APIs (Parallel)
    ========================== */

    const [
      weatherRes,
      pollutionRes,
      pollutionForecastRes,
      geoRes,
      forecastRes,
    ] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=5&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
      ),
    ]);

    if (!weatherRes.ok || !pollutionRes.ok || !forecastRes.ok) {
      return NextResponse.json(
        { message: "Weather service unavailable" },
        { status: 502 }
      );
    }

    const wData = await weatherRes.json();
    const pData = await pollutionRes.json();
    const pfData = await pollutionForecastRes.json();
    const geoData = await geoRes.json();
    const forecastData = await forecastRes.json();

    /* =========================
       Force Rangsit–Khlong Luang
    ========================== */

    const isRangsit =
      latitude >= 13.98 &&
      latitude <= 14.10 &&
      longitude >= 100.48 &&
      longitude <= 100.65;

    let areaName = "Unknown Location";

    if (isRangsit) {
      areaName = "รังสิต, คลองหลวง";
    } else {
      const district =
        geoData?.find((g: any) => g.local_names?.th)?.local_names?.th ||
        geoData?.[0]?.name ||
        null;

      const province =
        geoData?.[0]?.state ||
        wData?.name ||
        null;

      areaName =
        district && province && district !== province
          ? `${district}, ${province}`
          : district || province || "Unknown Location";
    }

    /* =========================
       PM2.5 → US AQI Standard
    ========================== */

    const pm25 = pData?.list?.[0]?.components?.pm2_5 ?? 0;

    function calculateAQI(pm: number) {
      if (pm <= 12)
        return (50 / 12) * pm;
      if (pm <= 35.4)
        return ((100 - 51) / (35.4 - 12.1)) * (pm - 12.1) + 51;
      if (pm <= 55.4)
        return ((150 - 101) / (55.4 - 35.5)) * (pm - 35.5) + 101;
      if (pm <= 150.4)
        return ((200 - 151) / (150.4 - 55.5)) * (pm - 55.5) + 151;
      return 300;
    }

    const displayAqi = Math.round(calculateAQI(pm25));

    /* =========================
       AQI Forecast (12 hr)
    ========================== */

    const aqiHourly =
      pfData?.list?.slice(0, 12).map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pm25: item.components?.pm2_5 ?? 0,
      })) || [];

    /* =========================
       5-Day Weather Forecast
    ========================== */

    const dailyForecast =
      forecastData?.list
        ?.filter((item: any) =>
          item.dt_txt.includes("12:00:00")
        )
        ?.slice(0, 5)
        ?.map((item: any) => ({
          date: item.dt_txt.split(" ")[0],
          temp: Math.round(item.main.temp),
          rain: item.pop
            ? Math.round(item.pop * 100)
            : 0,
        })) || [];

    /* =========================
       Final Response
    ========================== */

    return NextResponse.json({
      temp: Math.round(wData?.main?.temp ?? 0),
      desc: wData?.weather?.[0]?.description ?? "Unknown",
      city: areaName,
      aqi: displayAqi,
      pm25,
      aqiHourly,
      forecast: dailyForecast, // 🔥 สำคัญ
    });

  } catch (error) {
    console.error("Weather API error:", error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}