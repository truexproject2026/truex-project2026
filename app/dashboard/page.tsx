'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [name, setName] = useState("");
  const [aqi, setAqi] = useState(0);
  const [aiAdvice, setAiAdvice] = useState("กดปุ่มด้านล่างเพื่อให้ TrueX AI เริ่มวิเคราะห์ข้อมูลครับ");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ 
    temp: "--", desc: "Loading...", city: "Searching...", hourlyForecast: [] 
  });
  const [aqiHourly, setAqiHourly] = useState<any[]>([]); 
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);

  const notifiedRef = useRef<string[]>([]);

  /* ================= LOGOUT FUNCTION ================= */
  const handleLogout = () => {
    localStorage.removeItem('userName'); 
    router.push('/login'); 
  };

  /* ================= SPEAK FUNCTION (MOBILE FIX) ================= */
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("th")) || 
                     voices.find(v => v.lang.includes("th"));
    if (thaiVoice) utterance.voice = thaiVoice;
    utterance.lang = "th-TH";
    utterance.rate = 1.0; 
    utterance.pitch = 1.1; 
    window.speechSynthesis.speak(utterance);
  };

  /* ================= AUTO REMINDER ================= */
  const checkAutoReminders = useCallback(() => {
    const now = new Date();
    events.forEach(event => {
      const [y, m, d] = event.event_date.split("-").map(Number);
      const [h, min] = event.event_time.split(":").map(Number);
      const eventTime = new Date(y, m - 1, d, h, min);
      const diffMins = Math.ceil((eventTime.getTime() - now.getTime()) / 60000);

      const alertPoints = [30, 20, 10, 5];
      if (alertPoints.includes(diffMins)) {
        const notifyKey = `${event.id}-${diffMins}`;
        if (!notifiedRef.current.includes(notifyKey)) {
          speak(`ขออนุญาตแจ้งเตือนครับคุณ ${name} อีกประมาณ ${diffMins} นาที จะถึงนัดเรื่อง ${event.title} ครับ`);
          notifiedRef.current.push(notifyKey);
        }
      }
    });
  }, [events, name]);

  /* ================= FETCH DATA ================= */
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events', { method: 'GET', cache: 'no-store' });
      const d = await res.json();
      setEvents(d.events || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchData = useCallback(async (lat: number = 13.75, lon: number = 100.50) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setWeather({ temp: data.temp?.toString() || "--", desc: data.desc || "-", city: data.city || "Bangkok", hourlyForecast: data.aqiHourly || [] });
      setAqi(data.aqi || 0);
      setAqiHourly(data.aqiHourly || []);
    } catch (err) { console.error(err); }
  }, []);

  const handleAnalyze = async (isVoice: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aqi, temp: weather.temp, desc: weather.desc, aqiHourly, weatherHourly: weather.hourlyForecast }),
      });
      const data = await res.json();
      setAiAdvice(data.analysis || "วิเคราะห์เสร็จสิ้นครับ");
      if (isVoice) speak(data.analysis);
    } catch { setAiAdvice("ขออภัย ระบบ AI ขัดข้อง"); }
    finally { setIsLoading(false); }
  };

  /* ================= VOICE & LISTEN ================= */
  const parseThaiTime = (text: string) => {
    let t = text.replace(/ครับ|ค่ะ|นะ|หน่อย|ที|ให้หน่อย/gi, "").replace(/\s+/g, "");
    let hour: number | null = null;
    let minute: number = 0;
    const digitalMatch = t.match(/(\d{1,2})[:.](\d{2})/);
    if (digitalMatch) {
      hour = parseInt(digitalMatch[1]);
      minute = parseInt(digitalMatch[2]);
    } else {
      const hourMatch = t.match(/(\d+)(โมง|ทุ่ม|ตี|บ่าย)/);
      if (hourMatch) {
        let num = parseInt(hourMatch[1]);
        let type = hourMatch[2];
        if (type === "ทุ่ม") hour = num + 18;
        else if (type === "ตี") hour = num;
        else if (type === "บ่าย") hour = num + 12;
        else if (type === "โมง") hour = num <= 6 ? num + 12 : num;
        const afterText = t.split(type)[1];
        const minMatch = afterText ? afterText.match(/^(\d+)/) : null;
        if (minMatch) minute = parseInt(minMatch[1]);
      }
    }
    return hour !== null ? `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00` : null;
  };

  const handleVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    if (lowerText.includes("สวัสดี")) { speak(`สวัสดีครับคุณ ${name} มีอะไรให้ช่วยไหมครับ?`); return; }
    if (lowerText.includes("อากาศ")) { handleAnalyze(true); return; }
    if (lowerText.includes("เพิ่มนัด") || (lowerText.includes("นัด") && !lowerText.includes("นัดอะไรบ้าง"))) {
      const time = parseThaiTime(lowerText);
      let cleanTitle = lowerText.replace(/เพิ่มนัด|นัด|จอง|ตอนบ่าย|บ่าย|ตอน/gi, "").replace(/\d{1,2}[:.]\d{2}/g, "").replace(/\d+/g, "").replace(/นาฬิกา|นาที|โมง|ทุ่ม|ตี/gi, "").replace(/\s+[น]\.?\s*$/g, "").replace(/[น]\.?$/g, "").trim();
      if (time && cleanTitle) {
        fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cleanTitle, event_date: new Date().toISOString().split("T")[0], event_time: time }) }).then(async () => {
          const [h, m] = time.split(':');
          speak(`บันทึกนัด ${cleanTitle} ตอน ${parseInt(h)} นาฬิกา ${parseInt(m)} นาที เรียบร้อยครับ`);
          await fetchEvents();
        });
      }
      return;
    }
  };

  const startListening = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); // Unlock Audio
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = "th-TH";
    rec.onresult = (e: any) => handleVoiceCommand(e.results[0][0].transcript);
    rec.start();
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (now.getSeconds() === 0) checkAutoReminders();
    }, 1000);
    return () => clearInterval(timer);
  }, [checkAutoReminders]);

  useEffect(() => {
    if (!isMounted) return;
    setName(localStorage.getItem('userName') || "User");
    fetchEvents();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(p => fetchData(p.coords.latitude, p.coords.longitude), () => fetchData());
    } else fetchData();
  }, [isMounted, fetchData, fetchEvents]);

  const formattedTime = useMemo(() => currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), [currentTime]);

  const upcomingEventsList = useMemo(() => {
    const now = new Date();
    const buffer = now.getTime() - 300000; 
    return events
      .map(e => {
        const [y, m, d] = e.event_date.split("-").map(Number);
        const [h, min] = e.event_time.split(":").map(Number);
        return { ...e, fullDateTime: new Date(y, m - 1, d, h, min) };
      })
      .filter(e => e.fullDateTime.getTime() > buffer)
      .sort((a, b) => a.fullDateTime.getTime() - b.fullDateTime.getTime());
  }, [events, currentTime]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0c0f14] font-sans text-white transition-all duration-500">
      {/* Navigation: Responsive Padding */}
      <nav className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-red-900/30 bg-[#0f1720]/90 p-3 md:p-4 backdrop-blur-xl gap-3">
        <div className="flex items-center gap-3 md:gap-6">
          <h1 className="text-xl md:text-2xl font-black italic text-red-500">TrueX</h1>
          <div className="hidden sm:flex border-l border-red-900/30 pl-4 md:pl-6 gap-4 text-[10px] md:text-xs font-bold">
            <div className="flex flex-col"><span className="text-red-400 uppercase">{weather.city}</span>{weather.temp}°C • {weather.desc}</div>
            <div className="flex flex-col border-l border-red-900/30 pl-4 uppercase italic text-red-400">Live Time<span className="text-white/90">{formattedTime}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={startListening} className="rounded-lg md:rounded-xl border border-red-500 bg-black px-3 py-2 md:px-6 md:py-3 text-sm md:text-base text-red-500 hover:bg-red-600 hover:text-white transition-all">🎙 พูด</button>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all uppercase">Logout</button>
        </div>
      </nav>

      {/* Main Content: Responsive Grid */}
      <main className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 p-4 md:p-10">
        <div className="md:col-span-2 space-y-6">
          {/* AQI Card:ขยายเต็มจอในมือถือ */}
          <div className="p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-red-900/20 bg-slate-900/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1 md:w-2 bg-red-500"></div>
            <h2 className="mb-2 md:mb-4 text-[10px] font-semibold italic uppercase tracking-widest text-red-400">Live Air Quality</h2>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl md:text-8xl font-black text-red-500">{aqi}</span>
              <span className="text-sm md:text-xl font-bold text-red-500 italic uppercase">Warning</span>
            </div>
          </div>

          <button onClick={() => handleAnalyze()} disabled={isLoading} className="w-full rounded-[1.2rem] md:rounded-[1.5rem] bg-gradient-to-r from-red-700 to-red-600 p-6 md:p-8 text-lg md:text-xl font-black shadow-xl active:scale-95 transition-all">
            {isLoading ? "ANALYZING..." : "ANALYZE WITH AI"}
          </button>

          {/* Table Container: Scrollable on mobile */}
          <div className="bg-[#111418] p-6 md:p-8 rounded-[1.2rem] md:rounded-[1.5rem] border border-red-900/30 shadow-lg">
            <h3 className="mb-6 text-xs md:text-sm italic uppercase text-red-400 tracking-widest">Schedule</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {upcomingEventsList.length === 0 ? <p className="text-sm text-white/50 italic text-center">ไม่มีนัดหมาย</p> : 
                upcomingEventsList.map(e => (
                  <div key={e.id} className="p-4 md:p-5 bg-black/40 rounded-xl md:rounded-2xl border border-red-800/20 flex justify-between items-center group hover:border-red-500 transition-all">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-bold text-sm md:text-lg text-white group-hover:text-red-400 transition-colors truncate">{e.title}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{e.event_date}</p>
                    </div>
                    <span className="text-red-400 font-bold bg-red-950/30 px-3 py-1 rounded-lg text-xs md:text-sm whitespace-nowrap">{e.event_time}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Insight: จะมาอยู่ด้านล่างสุดในมือถือ */}
        <div className="rounded-[1.5rem] md:rounded-[2rem] border border-red-900/30 bg-gradient-to-br from-[#111418] to-[#0f0f12] p-6 md:p-10 text-white shadow-xl min-h-[300px] md:min-h-[420px] relative overflow-hidden self-start">
          <div className="text-4xl md:text-6xl opacity-5 text-red-500 italic font-serif">“</div>
          <div className="z-10 relative">
            <h3 className="mb-3 border-b border-red-900/40 pb-3 text-[10px] md:text-xs font-semibold italic text-red-400 uppercase">TrueX Smart Insight</h3>
            <p className="mt-4 text-base md:text-xl font-medium leading-relaxed text-white/90">{aiAdvice}</p>
          </div>
        </div>
      </main>
    </div>
  );
}