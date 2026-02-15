'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

let weatherCache: { data: any, timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; 

export default function Dashboard() {
  const [name, setName] = useState("");
  const [aqi, setAqi] = useState(0); 
  const [aiAdvice, setAiAdvice] = useState("กดปุ่มด้านล่างเพื่อให้ TrueX AI เริ่มวิเคราะห์ข้อมูลครับ");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: "--", desc: "Loading...", city: "Searching..." });
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  const aqiStyle = useMemo(() => {
    if (aqi === 0)
      return {
        dot: "bg-slate-500",
        text: "text-slate-400",
        border: "border-slate-700",
        bg: "bg-gradient-to-br from-[#141414] to-[#1c1c1c]",
        glow: "shadow-none",
        label: "กำลังโหลด..."
      };

    if (aqi <= 50)
      return {
        dot: "bg-green-500",
        text: "text-green-400",
        border: "border-green-500/40",
        bg: "bg-gradient-to-br from-[#141414] to-[#1c1c1c]",
        glow: "shadow-[0_0_60px_rgba(34,197,94,0.12)]",
        label: "อากาศดีมาก"
      };

    if (aqi <= 100)
      return {
        dot: "bg-yellow-400",
        text: "text-yellow-400",
        border: "border-yellow-500/40",
        bg: "bg-gradient-to-br from-[#141414] to-[#1c1c1c]",
        glow: "shadow-[0_0_60px_rgba(250,204,21,0.12)]",
        label: "ปานกลาง"
      };

    if (aqi <= 150)
      return {
        dot: "bg-orange-500",
        text: "text-orange-400",
        border: "border-orange-500/40",
        bg: "bg-gradient-to-br from-[#141414] to-[#1c1c1c]",
        glow: "shadow-[0_0_60px_rgba(249,115,22,0.12)]",
        label: "เริ่มมีผลกระทบ"
      };

    if (aqi <= 200)
      return {
        dot: "bg-red-600",
        text: "text-red-500",
        border: "border-red-500/40",
        bg: "bg-gradient-to-br from-[#141414] to-[#1c1c1c]",
        glow: "shadow-[0_0_60px_rgba(220,38,38,0.12)]",
        label: "ไม่ดีต่อสุขภาพ"
      };

    return {
      dot: "bg-purple-700",
      text: "text-purple-500",
      border: "border-purple-600/40",
      bg: "bg-gradient-to-br from-[#141414] to-[#1c1c1c]",
      glow: "shadow-[0_0_60px_rgba(147,51,234,0.12)]",
      label: "อันตรายมาก"
    };
  }, [aqi]);

  useEffect(() => {
    setIsMounted(true);
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const timeDisplay = useMemo(() => {
    return currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (weatherCache && (now - weatherCache.timestamp < CACHE_DURATION)) {
      setWeather(weatherCache.data.weather);
      setAqi(weatherCache.data.aqi);
      return;
    }

    fetch(`/api/weather?lat=13.75&lon=100.50`)
      .then(r => r.json())
      .then(data => {
        const formatted = {
          weather: { 
            temp: data.temp?.toString() || "--", 
            desc: data.desc || "-", 
            city: data.city || "Bangkok" 
          },
          aqi: data.aqi || 0
        };

        weatherCache = { data: formatted, timestamp: now };
        setWeather(formatted.weather);
        setAqi(formatted.aqi);
      });
  }, []);

  useEffect(() => {
    if (isMounted) {
      setName(localStorage.getItem('userName') || "User");
      fetchData();
    }
  }, [isMounted, fetchData]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setAiAdvice("TrueX AI กำลังประมวลผลข้อมูลอากาศและพลังงาน...");
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aqi, temp: weather.temp }),
      });
      const data = await res.json();
      setAiAdvice(data.analysis || "วิเคราะห์เสร็จสิ้นครับ");
    } catch {
      setAiAdvice("ขออภัย ระบบ AI ขัดข้องชั่วคราว");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('userName');
    document.cookie = "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/login';
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0c0f14] font-sans text-white transition-all duration-700">

      <nav className="bg-[#0f1720]/80 backdrop-blur-xl p-4 border-b border-red-900/30 flex justify-between items-center shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-red-500 italic tracking-tight">TrueX</h1>

          <div className="flex border-l pl-6 gap-6 items-center border-red-900/30">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-widest">
                {weather.city}
              </span>
              <span className="text-sm font-bold text-white/90">
                {weather.temp}°C • {weather.desc}
              </span>
            </div>

            <div className="flex flex-col border-l pl-6 border-red-900/30">
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-widest italic">
                Live Time
              </span>
              <span className="text-sm font-bold text-white/90">
                {timeDisplay}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 bg-red-900/30 px-4 py-2 rounded-xl border border-red-800/30">
            <span className="text-xs font-semibold text-red-400 italic">
              Welcome,
            </span>
            <span className="font-bold text-white text-sm max-w-[100px] truncate">
              {name}
            </span>
          </div>

          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md active:scale-95 transition-all"
          >
            LOGOUT
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        <div className="md:col-span-2 space-y-6">

          <div className={`p-10 rounded-[2rem] border transition-all duration-700 relative overflow-hidden ${aqiStyle.bg} ${aqiStyle.border} ${aqiStyle.glow}`}>
            <div className={`absolute top-0 right-0 w-2 h-full ${aqiStyle.dot}`}></div>

            <h2 className="text-red-400 font-semibold uppercase text-[11px] tracking-[0.3em] italic mb-4">
              Live Air Quality Index
            </h2>

            <div className="flex items-baseline gap-4 mt-2">
              <span className={`text-8xl font-black leading-none ${aqiStyle.text}`}>
                {aqi}
              </span>

              <div className="flex flex-col gap-1">
                <span className={`font-semibold text-xl flex items-center gap-2 ${aqiStyle.text}`}>
                  <span className={`w-3 h-3 rounded-full ${aqiStyle.dot} animate-pulse`}></span>
                  {aqiStyle.label}
                </span>

                <span className="text-red-500/80 text-xs italic tracking-wide">
                  Unlimited API Active
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-red-700 to-red-600 
            text-white p-8 rounded-[1.5rem] 
            font-black text-xl tracking-wide
            shadow-xl hover:from-red-600 hover:to-red-500 
            hover:shadow-red-600/30 
            transition-all duration-300 
            active:scale-95 
            disabled:from-slate-700 disabled:to-slate-700 
            disabled:shadow-none"
          >
            {isLoading ? "ANALYZING..." : "ANALYZE WITH TRUEX AI"}
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#111418] to-[#0f0f12] 
        p-10 rounded-[2rem] 
        text-white flex flex-col justify-between 
        shadow-xl min-h-[400px] 
        border border-red-900/30 
        relative overflow-hidden">

          <div className="text-6xl opacity-5 text-red-500 italic font-serif">“</div>

          <div className="z-10 relative">
            <h3 className="text-xs font-semibold text-red-400 mb-3 
            tracking-[0.35em] uppercase italic 
            border-b border-red-900/40 pb-3">
              TrueX Smart Insight
            </h3>

            <p className="text-xl font-medium leading-relaxed mt-4 text-white/90">
              {aiAdvice}
            </p>
          </div>

          <div className="mt-8 flex gap-2 h-10 items-end">
            {[0.4, 0.9, 0.6, 1, 0.5, 0.8, 0.4].map((h, i) => (
              <div
                key={i}
                className={`flex-1 bg-white/30 rounded-full ${isLoading ? 'animate-pulse' : 'animate-bounce'}`}
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
