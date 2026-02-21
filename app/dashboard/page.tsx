'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [aqi, setAqi] = useState(0);
  const [aiAdvice, setAiAdvice] = useState("กดปุ่มด้านล่างเพื่อให้ TrueX AI เริ่มวิเคราะห์ข้อมูลครับ");
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState({ temp: "--", desc: "Loading...", city: "กำลังระบุตำแหน่ง..." });
  const [location, setLocation] = useState({ lat: null as number | null, lon: null as number | null });
  const [isMounted, setIsMounted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const router = useRouter();

  /* ================= 🛠️ FIXED: REDIRECT URI & AUTH ================= */
  const syncGoogleCalendar = () => {
    const client_id = "590721730112-l6g9a44d5hl8nm7sbe3p71l2r3g45n56.apps.googleusercontent.com";
    
    // ล็อก URI ให้เป๊ะตามที่ตั้งใน Google Console
    const origin = window.location.origin;
    const redirect_uri = `${origin}/dashboard`;
    const scope = "openid email profile https://www.googleapis.com/auth/calendar.events";
    
    // สร้าง URL แบบ Encode ครบทุกจุด
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const fetchGoogleEvents = useCallback(async (token: string) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=5&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.items) {
        setEvents(data.items.map((item: any) => ({
          id: item.id,
          title: item.summary,
          event_time: item.start.dateTime ? new Date(item.start.dateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : "All Day"
        })));
      }
    } catch (err) { console.error("Calendar Fetch Error:", err); }
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = "th-TH";
    window.speechSynthesis.speak(ut);
  };

  const addGoogleEvent = async (text: string) => {
    if (!googleToken) return speak("กรุณาล็อกอินกูเกิลก่อนค่ะ");
    let t = text.replace(/\s+/g, "");
    const thaiNumMap: { [key: string]: string } = { "หนึ่ง": "1", "สอง": "2", "สาม": "3", "สี่": "4", "ห้า": "5", "หก": "6", "เจ็ด": "7", "แปด": "8", "เก้า": "9", "สิบ": "10" };
    Object.keys(thaiNumMap).forEach(key => { t = t.replace(new RegExp(key, 'g'), thaiNumMap[key]); });

    let now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let date = now.getDate();
    let hour = -1;

    if (t.includes("ตี")) {
      const m = t.match(/ตี(\d+)/);
      if (m) { hour = parseInt(m[1]); if (now.getHours() >= 12) date += 1; }
    } else if (t.includes("ทุ่ม")) {
      const m = t.match(/(\d+)ทุ่ม/);
      if (m) hour = parseInt(m[1]) + 18;
    } else if (t.includes("บ่าย")) {
      const m = t.match(/บ่าย(\d+)/);
      if (m) hour = parseInt(m[1]) + 12;
      else if (t.includes("บ่ายโมง")) hour = 13;
    } else if (t.includes("โมงเย็น")) {
      const m = t.match(/(\d+)โมงเย็น/);
      if (m) hour = parseInt(m[1]) + 12;
    } else if (t.includes("โมง") && !t.includes("บ่าย") && !t.includes("เย็น")) {
      const m = t.match(/(\d+)โมง/);
      if (m) hour = parseInt(m[1]);
    }

    if (hour === -1) {
      const lonelyNum = t.match(/(\d+)/);
      if (lonelyNum) { let n = parseInt(lonelyNum[1]); hour = (n < 7) ? n + 12 : n; }
      else { return speak("กรุณาระบุเวลาที่ต้องการนัดหมายด้วยค่ะ"); }
    }

    const cleanTitle = text.replace(/เพิ่มนัด|จอง|ตอน|ตี|ทุ่ม|บ่าย|โมงเย็น|โมงเช้า|โมง|[0-9]|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ/g, "").trim();

    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const startTimeISO = `${year}-${pad(month + 1)}-${pad(date)}T${pad(hour)}:00:00+07:00`;
      const endTimeISO = `${year}-${pad(month + 1)}-${pad(date)}T${pad(hour + 1)}:00:00+07:00`;

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: cleanTitle || "นัดหมาย TrueX",
          start: { dateTime: startTimeISO, timeZone: "Asia/Bangkok" },
          end: { dateTime: endTimeISO, timeZone: "Asia/Bangkok" }
        }),
      });

      if (res.ok) {
        speak(`เพิ่มนัดหมายเรื่อง ${cleanTitle || "ใหม่"} เรียบร้อยแล้วค่ะ`);
        fetchGoogleEvents(googleToken);
      }
    } catch (err) { console.error("Add Event Error:", err); }
  };

  const handleVoiceCommand = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("เพิ่มนัด") || t.includes("จอง")) { addGoogleEvent(text); }
    else if (t.includes("มีนัด") || t.includes("เช็ค")) {
      const titles = events.map(e => e.title).join(", ");
      speak(titles ? `วันนี้นัดหมายของคุณมี ${titles} ค่ะ` : "ยังไม่มีนัดหมายค่ะ");
    } else if (t.includes("อากาศ") || t.includes("วิเคราะห์")) { handleAnalyze(); }
  };

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return alert("เบราว์เซอร์ไม่รองรับเสียง");
    const rec = new Recognition();
    rec.lang = "th-TH";
    rec.onresult = (e: any) => handleVoiceCommand(e.results[0][0].transcript);
    rec.start();
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aqi, temp: weather.temp, desc: weather.desc, nextEvent: events[0]?.title }),
      });
      const data = await res.json();
      setAiAdvice(data.analysis);
      speak(data.analysis);
    } catch { setAiAdvice("ระบบวิเคราะห์ขัดข้อง"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    setIsMounted(true);
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) { setGoogleToken(token); fetchGoogleEvents(token); window.history.replaceState(null, "", window.location.pathname); }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        try {
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          const d = await res.json();
          setWeather({ temp: d.temp, desc: d.desc, city: d.city || "Bangkok" });
          setAqi(d.aqi);
        } catch (err) { console.error("Weather fetch failed"); }
      }, () => { setWeather(prev => ({ ...prev, city: "กรุณาเปิด GPS" })); });
    }
  }, [fetchGoogleEvents]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0c0f14] text-white font-sans">
      <nav className="flex items-center justify-between p-4 border-b border-red-900/30 bg-[#0f1720]/90 sticky top-0 z-50">
        <h1 className="text-2xl font-black italic text-red-500 uppercase">TrueX</h1>
        <div className="flex gap-2">
          <button onClick={syncGoogleCalendar} className="bg-white/10 border border-white/20 px-3 py-2 rounded-lg text-[10px] font-bold uppercase">{googleToken ? "🔄 Sync Live" : "🔑 Login Google"}</button>
          <button onClick={startListening} className="border border-red-500 text-red-500 px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all">🎙 พูด</button>
          <button onClick={() => router.push('/login')} className="bg-red-600 px-4 py-2 rounded-lg text-[10px] font-bold">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="p-8 rounded-[2rem] bg-gradient-to-br from-red-900/20 to-transparent border border-red-900/30 shadow-2xl">
            <p className="text-red-400 uppercase text-[10px] font-black tracking-widest mb-2">Live Location Intelligence</p>
            <h2 className="text-4xl font-black">{weather.city}</h2>
            <p className="text-white/30 text-xs font-mono">LAT: {location.lat?.toFixed(5)} / LON: {location.lon?.toFixed(5)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-10 rounded-[3rem] bg-[#111418] border border-red-900/20">
              <p className="text-red-400 uppercase text-[10px] font-black tracking-widest mb-2">Air Quality Index</p>
              <h2 className="text-8xl font-black text-red-500 tracking-tighter">{aqi}</h2>
            </div>
            <div className="p-10 rounded-[3rem] bg-[#111418] border border-white/5 flex flex-col justify-center">
              <p className="text-white/40 uppercase text-[10px] font-black tracking-widest mb-2">Weather</p>
              <h2 className="text-6xl font-black">{weather.temp}°C</h2>
              <p className="text-red-500 font-bold uppercase text-xs mt-2">{weather.desc}</p>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-red-600 py-10 rounded-[3rem] text-3xl font-black shadow-2xl active:scale-95 transition-all">
            {isLoading ? "ANALYZING..." : "EXECUTE AI ANALYSIS"}
          </button>

          <div className="bg-[#111418] border border-red-900/20 p-10 rounded-[3rem]">
            <h3 className="text-red-400 uppercase text-[10px] font-black mb-8 border-b border-red-900/20 pb-4 tracking-widest">Upcoming Schedule</h3>
            <div className="space-y-4">
              {events.length === 0 ? <p className="text-center italic opacity-10">No active events found</p> :
                events.map(e => (
                  <div key={e.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-red-600/10 transition-all">
                    <p className="font-bold text-xl">{e.title}</p>
                    <div className="bg-red-600/20 text-red-500 px-6 py-3 rounded-2xl font-black text-xs">{e.event_time}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="bg-[#0f1216] border border-red-900/30 p-10 rounded-[3rem] self-start sticky top-28 shadow-2xl">
          <h3 className="text-red-500 text-[10px] font-black uppercase mb-8 border-b border-red-900/20 pb-4 tracking-widest">AI Intelligence</h3>
          <p className="text-2xl leading-relaxed italic text-white/80">“{aiAdvice}”</p>
        </div>
      </main>
    </div>
  );
}