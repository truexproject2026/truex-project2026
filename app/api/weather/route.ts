export const runtime = "edge";

import { NextResponse } from "next/server";

/* =========================
   📦 Types
========================= */

type WeatherResponse = {
  main?: { temp: number };
  weather?: { description: string }[];
  name?: string;
};

type PollutionResponse = {
  list?: {
    components?: {
      pm2_5?: number;
    };
  }[];
};

type PollutionForecastResponse = {
  list?: {
    dt: number;
    components: {
      pm2_5: number;
    };
  }[];
};

type GeoResponse = {
  name?: string;
  local_names?: {
    th?: string;
  };
}[];

type ForecastItem = {
  dt: number;
  main: {
    temp: number;
  };
  weather: {
    description: string;
  }[];
  pop?: number;
};

type ForecastResponse = {
  list?: ForecastItem[];
};

type ForecastDay = {
  date: string;
  temp: number;
  desc: string;
  rain: number;
};

type AQIHourly = {
  time: string;
  pm25: number;
};

/* =========================
   🚀 Handler
========================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { message: "Missing coordinates" },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "API key missing" },
        { status: 500 }
      );
    }

    const [
      weatherRes,
      pollutionRes,
      pollutionForecastRes,
      geoRes,
      forecastRes,
    ] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      ),
    ]);

    const wData: WeatherResponse = await weatherRes.json();
    const pData: PollutionResponse = await pollutionRes.json();
    const pfData: PollutionForecastResponse =
      await pollutionForecastRes.json();
    const geoData: GeoResponse = await geoRes.json();
    const forecastData: ForecastResponse = await forecastRes.json();

    /* =========================
       📍 LOCATION
    ========================== */

    const areaName =
      geoData?.[0]?.local_names?.th ||
      geoData?.[0]?.name ||
      wData.name ||
      "Unknown Location";

    /* =========================
       🌫 AQI
    ========================== */

    const pm25 = pData.list?.[0]?.components?.pm2_5 ?? 0;
    const displayAqi = Math.round(pm25 * 2);

    /* =========================
       📅 5 Day Forecast
    ========================== */

      const dailyForecast: {
        date: string;
        temp: number;
        desc: string;
        rain: number;
      }[] =
        forecastData.list
        ?.filter((_, index) => index % 8 === 0)
        .slice(0, 5)
        .map((item): ForecastDay => ({
          date: new Date(item.dt * 1000).toLocaleDateString("th-TH"),
          temp: Math.round(item.main.temp),
          desc: item.weather[0]?.description ?? "ไม่มีข้อมูล",
          rain: item.pop ? Math.round(item.pop * 100) : 0,
        })) ?? [];

    /* =========================
       🏆 BEST DAY SCORE
    ========================== */

    const scoredForecast = dailyForecast.map((d) => {
      let score = 100;

      if (d.temp > 37) score -= 25;
      if (d.rain > 60) score -= 30;
      else if (d.rain > 30) score -= 15;

      return { ...d, score };
    });

    const bestDay =
      scoredForecast.sort((a, b) => b.score - a.score)[0] ?? null;

    /* =========================
       📈 Temperature Trend
    ========================== */

    let tempSlope = 0;

    if (dailyForecast.length >= 2) {
      tempSlope =
        dailyForecast[dailyForecast.length - 1].temp -
        dailyForecast[0].temp;
    }

    let tempTrend = "คงที่";
    if (tempSlope > 2) tempTrend = "ร้อนขึ้นต่อเนื่อง";
    if (tempSlope < -2) tempTrend = "เย็นลงต่อเนื่อง";

    /* =========================
       🌧 Rain Pattern
    ========================== */

    const rainDays = dailyForecast.filter((d: any) => d.rain > 50).length;

    let rainPattern = "ฝนกระจาย";
    if (rainDays >= 2) rainPattern = "มีฝนหลายวันติด";
    if (rainDays === 0) rainPattern = "แทบไม่มีฝน";

    /* =========================
       🔥 Hot Day Count
    ========================== */

    const hotDays = dailyForecast.filter((d) => d.temp > 35).length;

    /* =========================
       ⏳ AQI Hourly
    ========================== */

    const aqiHourly: AQIHourly[] =
      pfData.list?.slice(0, 12).map((item) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pm25: item.components.pm2_5,
      })) ?? [];

    /* =========================
       📦 RESPONSE
    ========================== */

    return NextResponse.json({
      temp: wData.main ? Math.round(wData.main.temp) : 0,
      desc: wData.weather?.[0]?.description ?? "Unknown",
      city: areaName,
      aqi: displayAqi,
      aqiHourly,
      forecast: dailyForecast,
      trend: {
        hotDays,
        rainDays,
        tempTrend,
        rainPattern,
        bestDay,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Internal Error" },
      { status: 500 }
    );
  }
}