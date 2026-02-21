'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [aqi, setAqi] = useState(0);
  const [aiAdvice, setAiAdvice] = useState("กดปุ่มด้านล่างเพื่อให้ TrueX AI เริ่มวิเคราะห์ข้อมูล");
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState({ temp: "--", desc: "Loading...", city: "Searching..." });
  const [location, setLocation] = useState({ lat: null as number | null, lon: null as number | null });
  const [isMounted, setIsMounted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const router = useRouter();

  // 🔑 Google Login & Sync
  const syncGoogleCalendar = () => {
    const client_id = "590721730112-l6g9a44d5hl8nm7sbe3p71l2r3g45n56.apps.googleusercontent.com";
    const redirect_uri = `${window.location.origin}/dashboard`;
    const scope = "openid email profile https://www.googleapis.com/auth/calendar.events";
    const params = new URLSearchParams({ client_id, redirect_uri, response_type: "token", scope, prompt: "consent" });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const fetchGoogleEvents = useCallback(async (token: string) => {
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=10&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.items) {
        setEvents(data.items.map((item: any) => ({
          id: item.id,
          title: item.summary,
          full_date: item.start.dateTime || item.start.date,
          event_time: item.start.dateTime ? new Date(item.start.dateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : "ทั้งวัน"
        })));
      }
    } catch (err) { console.error(err); }
  }, []);

  /* ================= 🎙️ ระบบเสียงผู้หญิง (Cross-Platform) ================= */
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const ut = new SpeechSynthesisUtterance(text);
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

    // หาเสียงผู้หญิงไทยที่ละมุนที่สุด
    const femaleVoice = voices.find(v => 
      (v.lang.includes('th') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Kanya') || v.name.includes('Narayisa')))
    );

    if (femaleVoice) ut.voice = femaleVoice;
    ut.lang = "th-TH";
    ut.rate = 1.05; 
    ut.pitch = 1.0; 
    window.speechSynthesis.speak(ut);
  };

  /* ================= 🎙️ Helper: ล้างชื่อนัด (หางไม่ขาดแน่นอน) ================= */
  const cleanTitleOnly = (text: string) => {
    const trashWords = [
      "เพิ่มนัด", "จอง", "ยกเลิกนัด", "ลบนัด", "ยกเลิก", "ลบ", "นัดหมาย", "มีนัดอะไร", "เช็ค", "วันนี้", "พรุ่งนี้", "มะรืน",
      "ตอน", "เวลา", "นาฬิกา", "เที่ยงคืน", "เที่ยงวัน", "เที่ยง", "ตี", "ทุ่ม", "บ่ายโมง", "บ่าย", "โมงเย็น", "โมงเช้า", "โมง"
    ];
    let cleaned = text;
    trashWords.forEach(word => { cleaned = cleaned.replace(new RegExp(word, 'g'), ""); });
    
    // ลบเลข, เครื่องหมาย และ น. ที่เป็นเศษ
    cleaned = cleaned.replace(/[0-9]|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|[:]/g, "");
    cleaned = cleaned.replace(/\s+น\s*$/g, "").trim(); 
    return cleaned;
  };

  /* ================= 🎙️ ระบบจัดการนัดหมาย (The Parser) ================= */
  const addGoogleEvent = async (text: string) => {
    if (!googleToken) return speak("กรุณาล็อกอินกูเกิลก่อน");
    
    let t = text.replace(/\s+/g, "");
    const thaiNumMap: { [key: string]: string } = { "หนึ่ง": "1", "สอง": "2", "สาม": "3", "สี่": "4", "ห้า": "5", "หก": "6", "เจ็ด": "7", "แปด": "8", "เก้า": "9", "สิบ": "10" };
    Object.keys(thaiNumMap).forEach(key => { t = t.replace(new RegExp(key, 'g'), thaiNumMap[key]); });

    let targetDate = new Date();
    if (t.includes("พรุ่งนี้")) targetDate.setDate(targetDate.getDate() + 1);
    else if (t.includes("มะรืน")) targetDate.setDate(targetDate.getDate() + 2);

    let hour = -1;

    // ✨ Logic แกะเวลาแบบครอบคลุม
    if (t.includes("เที่ยงคืน")) hour = 0;
    else if (t.includes("เที่ยงวัน") || (t.includes("เที่ยง") && !t.includes("คืน"))) hour = 12;
    else if (t.includes("ตี")) {
      const m = t.match(/ตี(\d+)/);
      if (m) hour = parseInt(m[1]);
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
    } else if (t.includes("โมง") && !t.includes("บ่าย")) {
      const m = t.match(/(\d+)โมง/);
      if (m) {
        const val = parseInt(m[1]);
        hour = (val < 7) ? val + 12 : val;
      }
    }

    if (hour === -1) {
      const m = t.match(/(\d+)/);
      if (m) {
        const val = parseInt(m[1]);
        hour = (val <= 5) ? val + 12 : val;
      }
    }

    if (hour === -1 || hour > 23) return speak("บอกเวลาให้ชัดเจนด้วย");

    const cleanTitle = cleanTitleOnly(text);

    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const startTimeISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(hour)}:00:00+07:00`;
      const endTimeISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(hour + 1)}:00:00+07:00`;

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
        speak(`บันทึกนัดหมาย ${cleanTitle} เรียบร้อย`);
        fetchGoogleEvents(googleToken);
      }
    } catch (err) { console.error(err); }
  };

  const deleteGoogleEvent = async (text: string) => {
    if (!googleToken) return speak("กรุณาล็อกอินกูเกิลก่อน");
    const cleanSearchTitle = cleanTitleOnly(text);
    if (!cleanSearchTitle) return speak("บอกชื่อนัดที่ต้องการลบด้วย");
    try {
      const resSearch = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(cleanSearchTitle)}`,
        { headers: { Authorization: `Bearer ${googleToken}` } }
      );
      const searchData = await resSearch.json();
      if (searchData.items && searchData.items.length > 0) {
        const targetEvent = searchData.items[0];
        const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${targetEvent.id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${googleToken}` } }
        );
        if (delRes.ok) { speak(`ลบนัด ${targetEvent.summary} เรียบร้อย`); fetchGoogleEvents(googleToken); }
      } else { speak(`ไม่พบนัดชื่อ ${cleanSearchTitle}`); }
    } catch (err) { console.error(err); }
  };

  const checkSchedule = (text: string) => {
    let target = new Date();
    let dayLabel = "วันนี้";
    if (text.includes("พรุ่งนี้")) { target.setDate(target.getDate() + 1); dayLabel = "พรุ่งนี้"; }
    else if (text.includes("มะรืน")) { target.setDate(target.getDate() + 2); dayLabel = "วันมะรืน"; }

    const targetStr = target.toISOString().split('T')[0];
    const filtered = events.filter(e => e.full_date.startsWith(targetStr));

    if (filtered.length > 0) {
      const list = filtered.map(e => `${e.title} เวลา ${e.event_time}`).join(", ");
      speak(`${dayLabel} คุณมีนัดคือ ${list}`);
    } else { speak(`${dayLabel} คุณยังไม่มีนัดหมาย`); }
  };

  const handleVoiceCommand = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("ลบ") || t.includes("ยกเลิก")) deleteGoogleEvent(text);
    else if (t.includes("มีนัด") || t.includes("นัดอะไร") || t.includes("เช็ค")) checkSchedule(text);
    else if (t.includes("เพิ่มนัด") || t.includes("จอง")) addGoogleEvent(text);
    else if (t.includes("อากาศ") || t.includes("วิเคราะห์")) handleAnalyze();
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
      const analysisClean = data.analysis.replace(/ครับ|ค่ะ/g, "");
      setAiAdvice(analysisClean); 
      speak(analysisClean);
    } catch { setAiAdvice("ระบบขัดข้อง"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    setIsMounted(true);
    const updateVoices = () => { setAvailableVoices(window.speechSynthesis.getVoices()); };
    window.speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices();

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
        const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
        const d = await res.json();
        setWeather({ temp: d.temp, desc: d.desc, city: d.city });
        setAqi(d.aqi);
      });
    }
  }, [fetchGoogleEvents]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0c0f14] text-white font-sans selection:bg-red-500 selection:text-white">
      <nav className="flex items-center justify-between p-4 bg-[#0f1720]/90 sticky top-0 z-50 border-b border-red-900/30 backdrop-blur-md">
        <h1 className="text-2xl font-black italic text-red-500 uppercase tracking-tighter">TrueX</h1>
        <div className="flex gap-2">
          <button onClick={syncGoogleCalendar} className="bg-white/10 border border-white/20 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-white/20">{googleToken ? "🔄 Sync Live" : "🔑 Login Google"}</button>
          <button onClick={startListening} className="border border-red-500 text-red-500 px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">🎙 พูด</button>
          <button onClick={() => router.push('/login')} className="bg-red-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-700 transition-all">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="p-8 rounded-[2rem] bg-gradient-to-br from-red-900/20 to-transparent border border-red-900/30 shadow-2xl">
            <p className="text-red-400 uppercase text-[10px] font-black tracking-widest mb-2">Location Insight</p>
            <h2 className="text-4xl font-black">{weather.city}</h2>
            <p className="text-white/30 text-xs font-mono">LAT: {location.lat?.toFixed(5)} / LON: {location.lon?.toFixed(5)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-10 rounded-[3rem] bg-[#111418] border border-red-900/20 shadow-xl">
              <p className="text-red-400 uppercase text-[10px] font-black mb-2 tracking-widest">AQI</p>
              <h2 className="text-8xl font-black text-red-500 tracking-tighter">{aqi}</h2>
            </div>
            <div className="p-10 rounded-[3rem] bg-[#111418] border border-white/5 flex flex-col justify-center shadow-xl">
              <p className="text-white/40 uppercase text-[10px] font-black mb-2 tracking-widest">Temp</p>
              <h2 className="text-6xl font-black">{weather.temp}°C</h2>
              <p className="text-red-500 font-bold text-xs mt-2 uppercase">{weather.desc}</p>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-red-600 py-10 rounded-[3rem] text-3xl font-black shadow-[0_20px_50px_rgba(220,38,38,0.3)] active:scale-95 transition-all italic tracking-tighter hover:bg-red-500">
            {isLoading ? "Analyzing Data..." : "Execute AI Analysis"}
          </button>

          <div className="bg-[#111418] border border-red-900/20 p-10 rounded-[3rem] shadow-xl">
            <h3 className="text-red-400 uppercase text-[10px] font-black mb-8 border-b border-red-900/20 pb-4 tracking-widest">Upcoming Schedule</h3>
            <div className="space-y-4">
              {events.length === 0 ? <p className="opacity-10 py-10 text-center italic">No events found</p> :
                events.map(e => (
                  <div key={e.id} className="p-6 bg-white/5 rounded-2xl flex justify-between items-center group hover:bg-red-600/10 transition-all border border-white/5 hover:border-red-500/30">
                    <p className="font-bold text-xl">{e.title}</p>
                    <div className="bg-red-600/20 text-red-500 px-6 py-3 rounded-2xl font-black text-xs">{e.event_time}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="bg-[#0f1216] border border-red-900/30 p-10 rounded-[3rem] self-start sticky top-28 shadow-2xl backdrop-blur-xl">
          <h3 className="text-red-500 text-[10px] font-black uppercase mb-8 border-b border-red-900/20 pb-4 tracking-widest">AI Intelligence</h3>
          <p className="text-2xl leading-relaxed italic text-white/80">“{aiAdvice}”</p>
          <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-white/20">System Status</span>
            <span className="text-green-500">Optimal</span>
          </div>
        </div>
      </main>
    </div>
  );
}