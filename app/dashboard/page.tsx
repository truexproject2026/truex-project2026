'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
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

  /* ================= LOGOUT FUNCTION ================= */
  const handleLogout = () => {
    localStorage.removeItem('userName'); 
    router.push('/login'); 
  };

  /* ================= SPEAK ================= */
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("th")) || 
                     voices.find(v => v.lang.includes("th"));
    if (thaiVoice) utterance.voice = thaiVoice;
    utterance.lang = "th-TH";
    utterance.rate = 1.0; 
    utterance.pitch = 1.1; 
    speechSynthesis.speak(utterance);
  };

  /* ================= FETCH DATA & EVENTS ================= */
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events', { 
        method: 'GET',
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });
      const d = await res.json();
      setEvents(d.events || []);
    } catch (err) { console.error("Fetch Events Error:", err); }
  }, []);

  const fetchData = useCallback(async (lat: number = 13.75, lon: number = 100.50) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setWeather({ 
        temp: data.temp?.toString() || "--", desc: data.desc || "-", city: data.city || "Bangkok",
        hourlyForecast: data.aqiHourly || [] 
      });
      setAqi(data.aqi || 0);
      setAqiHourly(data.aqiHourly || []);
    } catch (err) { console.error(err); }
  }, []);

  /* ================= ANALYZE AI ================= */
  const handleAnalyze = async (isVoice: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          aqi, temp: weather.temp, desc: weather.desc,
          aqiHourly: aqiHourly, weatherHourly: weather.hourlyForecast 
        }),
      });
      const data = await res.json();
      setAiAdvice(data.analysis || "วิเคราะห์เสร็จสิ้นครับ");
      if (isVoice) speak(data.analysis);
    } catch { setAiAdvice("ขออภัย ระบบ AI ขัดข้องชั่วคราว"); }
    finally { setIsLoading(false); }
  };

  /* ================= VOICE COMMANDS (แก้บั๊กนาที) ================= */
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

        const afterTimeText = t.split(type)[1];
        const minuteMatch = afterTimeText ? afterTimeText.match(/^(\d+)/) : null;
        if (minuteMatch) minute = parseInt(minuteMatch[1]);
      }
    }
    return hour !== null ? `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00` : null;
  };

  const handleVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase().trim();

    const greetMatch = lowerText.includes("สวัสดีทรู") || lowerText.includes("สวัสดีทู") || lowerText.includes("สวัสดี true") || lowerText.includes("ทรูเอ็กซ์");
    if (greetMatch && lowerText.length < 20) {
      const greetings = [
        `สวัสดีครับคุณ ${name} มีอะไรให้ TrueX ช่วยวิเคราะห์หรือจัดการนัดหมายไหมครับ?`,
        `สวัสดีครับคุณ ${name} ผมพร้อมรับคำสั่งแล้วครับ`,
        `ทรูเอ็กซ์สแตนบายครับคุณ ${name}`
      ];
      speak(greetings[Math.floor(Math.random() * greetings.length)]);
      return;
    }
    
    if (lowerText.includes("อากาศ")) { handleAnalyze(true); return; }

    if (lowerText.includes("นัดอะไรบ้าง") || lowerText.includes("สรุปนัด")) {
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = events.filter(e => e.event_date === today);
      if (todayEvents.length === 0) {
        speak(`สำหรับวันนี้ คุณ ${name} ยังไม่มีนัดหมายที่บันทึกไว้ครับ`);
      } else {
        const summary = todayEvents.map(e => {
          const [h, m] = e.event_time.split(':');
          const timeLabel = parseInt(h) >= 12 ? `ช่วงบ่าย ${parseInt(h) === 12 ? 12 : parseInt(h)-12} โมง ${parseInt(m) > 0 ? parseInt(m) + ' นาที' : ''}` : `ช่วงเช้า ${parseInt(h)} โมง ${parseInt(m) > 0 ? parseInt(m) + ' นาที' : ''}`;
          return `${e.title} ใน${timeLabel}`;
        }).join(" และต่อด้วย ");
        speak(`ตารางนัดหมายวันนี้ มีทั้งหมด ${todayEvents.length} รายการครับ ได้แก่ ${summary} ครับผม`);
      }
      return;
    }

    if (lowerText.includes("เพิ่มนัด") || (lowerText.includes("นัด") && !lowerText.includes("นัดอะไรบ้าง"))) {
      const time = parseThaiTime(lowerText);
      let cleanTitle = lowerText
        .replace(/เพิ่มนัด|นัด|จอง|ตอนบ่าย|บ่าย|ตอน/gi, "")
        .replace(/\d{1,2}[:.]\d{2}/g, "")
        .replace(/\d+/g, "")
        .replace(/นาฬิกา|นาที|โมง|ทุ่ม|ตี/gi, "")
        .replace(/\s+[น]\.?\s*$/g, "") 
        .replace(/[น]\.?$/g, "") 
        .replace(/ครับ|ค่ะ|นะ|หน่อย|ที|ให้หน่อย|วันนี้|พรุ่งนี้/gi, "")
        .trim();

      if (time && cleanTitle) {
        fetch("/api/events", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ title: cleanTitle, event_date: new Date().toISOString().split("T")[0], event_time: time }) 
        }).then(async () => {
          const [h, m] = time.split(':');
          speak(`รับทราบครับคุณ ${name} บันทึกนัดเรื่อง ${cleanTitle} ตอน ${parseInt(h)} นาฬิกา ${parseInt(m)} นาที เรียบร้อยแล้วครับ`);
          await fetchEvents();
        });
      }
      return;
    }
  };

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = "th-TH";
    rec.onresult = (e: any) => handleVoiceCommand(e.results[0][0].transcript);
    rec.start();
  };

  /* ================= SMART SORTING ================= */
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

  /* ================= EFFECTS ================= */
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setName(localStorage.getItem('userName') || "User");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(p => fetchData(p.coords.latitude, p.coords.longitude), () => fetchData());
    } else fetchData();
    fetchEvents();
  }, [isMounted, fetchData, fetchEvents]);

  // ⚡ Live Time 24 ชม.
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }, [currentTime]);

  const aqiStyle = useMemo(() => {
    if (aqi <= 100) return { dot: "bg-green-500", text: "text-green-400", border: "border-green-500/40", label: "อากาศปกติ" };
    return { dot: "bg-red-600", text: "text-red-500", border: "border-red-500/40", label: "ควรระวัง" };
  }, [aqi]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0c0f14] font-sans text-white transition-all duration-700">
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-red-900/30 bg-[#0f1720]/80 p-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black italic text-red-500">TrueX</h1>
          <div className="flex border-l border-red-900/30 pl-6 gap-6 text-sm font-bold">
            <div className="flex flex-col"><span className="text-[10px] text-red-400 uppercase">{weather.city}</span>{weather.temp}°C • {weather.desc}</div>
            <div className="flex flex-col border-l border-red-900/30 pl-6 text-[10px] italic text-red-400 uppercase">Live Time<span className="text-sm font-bold text-white/90">{formattedTime}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={startListening} className="rounded-xl border border-red-500 bg-black px-6 py-3 text-red-500 hover:bg-red-600 hover:text-white transition-all">🎙 พูดกับ TrueX</button>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all">LOGOUT</button>
        </div>
      </nav>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 p-10 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className={`p-10 rounded-[2rem] border relative overflow-hidden bg-slate-900/20 ${aqiStyle.border}`}>
            <div className={`absolute right-0 top-0 h-full w-2 ${aqiStyle.dot}`}></div>
            <h2 className="mb-4 text-[11px] font-semibold italic uppercase tracking-[0.3em] text-red-400">Live Air Quality Index</h2>
            <div className="mt-2 flex items-baseline gap-4">
              <span className={`text-8xl font-black ${aqiStyle.text}`}>{aqi}</span>
              <span className={`text-xl font-semibold ${aqiStyle.text}`}>{aqiStyle.label}</span>
            </div>
          </div>

          <button onClick={() => handleAnalyze()} disabled={isLoading} className="w-full rounded-[1.5rem] bg-gradient-to-r from-red-700 to-red-600 p-8 text-xl font-black shadow-xl transition-all active:scale-95">{isLoading ? "ANALYZING..." : "ANALYZE WITH TRUEX AI"}</button>

          <div className="bg-[#111418] p-8 rounded-[1.5rem] border border-red-900/30 shadow-lg">
            <h3 className="mb-6 text-sm italic uppercase text-red-400 tracking-widest">Upcoming Schedule</h3>
            <div className="space-y-4">
              {upcomingEventsList.length === 0 ? <p className="text-sm text-white/50 italic text-center">ยังไม่มีนัดหมาย</p> : 
                upcomingEventsList.slice(0, 4).map(e => (
                  <div key={e.id} className="p-5 bg-black/40 rounded-2xl border border-red-800/20 flex justify-between items-center group hover:border-red-500 transition-all">
                    <div><p className="font-bold text-white text-lg group-hover:text-red-400 transition-colors">{e.title}</p><p className="text-[10px] text-white/40 uppercase tracking-widest">{e.event_date}</p></div>
                    <span className="text-red-400 font-bold bg-red-950/30 px-3 py-1 rounded-lg">{e.event_time}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-red-900/30 bg-gradient-to-br from-[#111418] to-[#0f0f12] p-10 text-white shadow-xl min-h-[420px] relative overflow-hidden self-start">
          <div className="text-6xl opacity-5 text-red-500 italic font-serif">“</div>
          <div className="z-10 relative">
            <h3 className="mb-3 border-b border-red-900/40 pb-3 text-xs font-semibold italic text-red-400 uppercase">TrueX Smart Insight</h3>
            <p className="mt-4 text-xl font-medium leading-relaxed text-white/90">{aiAdvice}</p>
          </div>
          <div className="mt-6 flex items-center gap-2"><div className="h-1 w-8 rounded-full bg-red-600 animate-pulse"></div><span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Forecast Online</span></div>
        </div>
      </main>
    </div>
  );
}