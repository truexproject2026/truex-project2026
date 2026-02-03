'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ⚡ ข้อที่ 1: Client-side Caching (เก็บข้อมูลไว้ 5 นาที เพื่อความเร็วสูงสุด)
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

  // 🎨 ข้อที่ 2: Visual Insights (เปลี่ยนสีตามค่า AQI มาตรฐานสากล)
  const aqiStyle = useMemo(() => {
    if (aqi === 0) return { dot: "bg-slate-300", text: "text-slate-400", bg: "bg-white", border: "border-slate-100", label: "กำลังโหลดข้อมูล..." };
    if (aqi <= 50) return { dot: "bg-green-500", text: "text-green-500", bg: "bg-green-50", border: "border-green-100", label: "อากาศดีมาก" };
    if (aqi <= 100) return { dot: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100", label: "คุณภาพอากาศปานกลาง" };
    if (aqi <= 150) return { dot: "bg-orange-500", text: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100", label: "เริ่มมีผลกระทบต่อสุขภาพ" };
    return { dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: "อันตรายต่อสุขภาพ" };
  }, [aqi]);

  // ⚡ ข้อที่ 3: Memoization นาฬิกา (แยกออกมาไม่ให้ Re-render ทั้งหน้า)
  useEffect(() => {
    setIsMounted(true);
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const timeDisplay = useMemo(() => {
    return currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  // ฟังก์ชันดึงข้อมูลที่มีระบบ Cache และเรียกจาก OpenWeather หลังบ้าน
  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (weatherCache && (now - weatherCache.timestamp < CACHE_DURATION)) {
      setWeather(weatherCache.data.weather);
      setAqi(weatherCache.data.aqi);
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          if (res.ok && data.temp !== undefined) {
            const result = {
              weather: { temp: data.temp.toString(), desc: data.desc, city: data.city },
              aqi: data.aqi
            };
            weatherCache = { data: result, timestamp: now };
            setWeather(result.weather);
            setAqi(result.aqi);
          }
        } catch (err) { console.error("Fetch Error:", err); }
      }, () => {
        // Default: Bangkok
        fetch(`/api/weather?lat=13.75&lon=100.50`).then(r => r.json()).then(data => {
          setWeather({ temp: data.temp.toString(), desc: data.desc, city: data.city + " (Default)" });
          setAqi(data.aqi || 0);
        });
      });
    }
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
    } catch (err) { 
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-all duration-700">
      <nav className="bg-white p-3 md:p-5 border-b flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 md:gap-6">
          <h1 className="text-xl md:text-2xl font-black text-red-600 italic tracking-tighter">TrueX</h1>
          <div className="flex border-l pl-3 md:pl-6 gap-3 md:gap-6 items-center border-slate-200">
            <div className="flex flex-col">
              <span className="text-[7px] md:text-[10px] font-bold text-red-600 uppercase tracking-widest animate-pulse">{weather.city}</span>
              <span className="text-[9px] md:text-sm font-black text-slate-700">{weather.temp}°C • {weather.desc}</span>
            </div>
            <div className="flex flex-col border-l pl-3 md:pl-6 border-slate-100">
              <span className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Live Time</span>
              <span className="text-[9px] md:text-sm font-black text-slate-700">{timeDisplay}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <div className="flex items-center gap-1 bg-red-50 px-2 md:px-3 py-1 rounded-lg border border-red-100">
            <span className="text-[9px] md:text-xs font-bold text-red-600 italic">Welcome,</span>
            <span className="font-black text-slate-800 text-[10px] md:text-sm max-w-[80px] truncate">{name}</span>
          </div>
          <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white text-[10px] md:text-xs font-black px-3 md:px-5 py-2 rounded-xl shadow-lg active:scale-95 transition-all">LOGOUT</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* ⚡ AQI Dynamic Card: เปลี่ยนสีตามค่า AQI ที่คำนวณจาก OpenWeather */}
          <div className={`p-8 md:p-10 rounded-[2rem] shadow-sm border transition-all duration-700 relative overflow-hidden ${aqiStyle.bg} ${aqiStyle.border}`}>
            <div className={`absolute top-0 right-0 w-2 h-full ${aqiStyle.dot}`}></div>
            <h2 className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] italic mb-4">Live Air Quality Index</h2>
            <div className="flex items-baseline gap-4 mt-2">
              <span className={`text-7xl md:text-9xl font-black leading-none ${aqiStyle.text}`}>{aqi}</span>
              <div className="flex flex-col gap-1">
                <span className={`font-bold text-lg md:text-xl flex items-center gap-2 ${aqiStyle.text}`}>
                  <span className={`w-3 h-3 rounded-full ${aqiStyle.dot} animate-pulse`}></span>
                  {aqiStyle.label}
                </span>
                <span className="text-slate-400 text-[10px] italic underline italic">Unlimited API Active</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleAnalyze} 
            disabled={isLoading} 
            className="w-full bg-red-600 text-white p-6 md:p-8 rounded-[1.5rem] font-black text-lg md:text-xl shadow-xl hover:bg-red-700 transition-all active:scale-95 disabled:bg-slate-300"
          >
            {isLoading ? "ANALYZING..." : "ANALYZE WITH TRUEX AI"}
          </button>
        </div>

        {/* AI Insight Sidebar */}
        <div className="bg-red-600 p-8 md:p-10 rounded-[2rem] text-white flex flex-col justify-between shadow-2xl min-h-[400px] border border-white/10 relative overflow-hidden">
          <div className="text-5xl md:text-6xl opacity-20 italic font-serif">“</div>
          <div className="z-10 relative">
            <h3 className="text-[10px] font-bold opacity-60 mb-2 tracking-[0.3em] uppercase italic border-b border-white/20 pb-2">TrueX Smart Insight</h3>
            <p className="text-lg md:text-xl font-medium leading-relaxed mt-4 drop-shadow-md">{aiAdvice}</p>
          </div>
          <div className="mt-8 flex gap-2 h-10 items-end">
              {[0.4, 0.9, 0.6, 1, 0.5, 0.8, 0.4].map((h, i) => (
                <div key={i} className={`flex-1 bg-white/40 rounded-full ${isLoading ? 'animate-pulse' : 'animate-bounce'}`} style={{height: `${h*100}%`, animationDelay: `${i*0.1}s`}}></div>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}