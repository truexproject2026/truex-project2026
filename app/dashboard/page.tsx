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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const router = useRouter();

  // 🔑 Google OAuth Logic
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

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => (v.lang.includes('th') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Kanya') || v.name.includes('Narayisa'))));
    if (femaleVoice) ut.voice = femaleVoice;
    ut.lang = "th-TH";
    ut.rate = 1.0;
    window.speechSynthesis.speak(ut);
  };

  const cleanTitleOnly = (text: string) => {
    // note: order matters! longer phrases must be removed before smaller parts
    const trashWords = [
      "เพิ่มนัดหมาย",
      "เพิ่มนัด", 
      "จอง", 
      "ยกเลิกนัด", 
      "ลบนัด", 
      "ยกเลิก", 
      "ลบ", 
      "นัดหมาย", 
      "ตอน", 
      "เวลา",
      // stray "หมาย" can appear when "เพิ่มนัด" is cut off from "นัดหมาย"
      "หมาย",
    ];
    let cleaned = text;
    trashWords.forEach(word => { cleaned = cleaned.replace(new RegExp(word, 'g'), ""); });
    
    // ✨ ลบเศษเวลาที่ติดมาในชื่อนัด เช่น "8:30 น" หรือ "แปดโมงครึ่ง"
    cleaned = cleaned.replace(/(วันนี้|พรุ่งนี้|มะรืน)/g, "");
    cleaned = cleaned.replace(/(\d+[:\.]\d+)(?:\s*น(?:\.|าฬิกา)?)?/g, "");
    cleaned = cleaned.replace(/(\d+|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)(โมง|ทุ่ม|ตี|น\.|นาฬิกา|ครึ่ง|นาที)/g, "");
    cleaned = cleaned.replace(/(เที่ยงคืน|เที่ยงวัน|เที่ยง|บ่ายโมง|บ่าย|โมงเย็น|โมงเช้า|โมง|นัดหมาย)/g, "");
    cleaned = cleaned.replace(/\s+น\s*$/g, "");
    return cleaned.trim();
  };

  /* ================= 🎙️ STABLE THAI TIME PARSER (ตี 2 = 02:00 / นาที) ================= */

  const parseDateTime = (text: string) => {
    let t = text.replace(/\s+/g, "");
    // remove the little word 'ตอน' which people sometimes prefix before a time
    t = t.replace(/ตอน/g, "");
    const thaiNumMap: { [key: string]: string } = { "หนึ่ง": "1", "สอง": "2", "สาม": "3", "สี่": "4", "ห้า": "5", "หก": "6", "เจ็ด": "7", "แปด": "8", "เก้า": "9", "สิบ": "10" };
    Object.keys(thaiNumMap).forEach(key => { t = t.replace(new RegExp(key, 'g'), thaiNumMap[key]); });

    const targetDate = new Date();
    if (t.includes("พรุ่งนี้")) targetDate.setDate(targetDate.getDate() + 1);
    else if (t.includes("มะรืน")) targetDate.setDate(targetDate.getDate() + 2);

    let hour = -1;
    let minute = 0;
    const explicit = t.match(/(\d{1,2})[:\.](\d{1,2})/);
    if (explicit) {
      hour = parseInt(explicit[1]);
      minute = parseInt(explicit[2]);
    }

    if (hour === -1) {
      if (t.includes("เที่ยงคืน")) hour = 0;
      else if (t.includes("เที่ยง")) hour = 12;
      else if (t.includes("ตี")) {
        const m = t.match(/ตี(\d+)/);
        if (m) hour = parseInt(m[1]);
      } else if (t.includes("ทุ่ม")) {
        const m = t.match(/(\d+)ทุ่ม/);
        if (m) hour = parseInt(m[1]) + 18;
      } else if (t.includes("บ่ายโมง")) hour = 13;
      else if (t.includes("บ่าย")) {
        const m = t.match(/บ่าย(\d+)/);
        if (m) hour = parseInt(m[1]) + 12; else hour = 13;
      } else if (t.includes("โมงเย็น")) {
        const m = t.match(/(\d+)โมงเย็น/);
        if (m) hour = parseInt(m[1]) + 12;
      } else if (t.includes("โมง")) {
        const m = t.match(/(\d+)โมง/);
        if (m) {
          const v = parseInt(m[1]);
          hour = (v >= 7 && v <= 11) ? v : (v <= 6 ? v + 12 : v);
        }
      }
    }

    if (hour !== -1 && minute === 0) {
      if (t.includes("ครึ่ง")) {
        minute = 30;
      } else {
        const minMatch = t.match(/(?:โมง|ทุ่ม|น\.|นาฬิกา|บ่าย|เย็น)(\d+)/) || t.match(/(\d+)นาที/);
        if (minMatch) minute = parseInt(minMatch[1]);
      }
    }

    if (hour === -1) {
      const m = t.match(/(\d+)/);
      if (m) {
        const v = parseInt(m[1]);
        hour = (v <= 5) ? v + 12 : v;
      }
    }

    if (hour === 0) {
      const now = new Date();
      const eventDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        hour,
        minute
      );
      if (eventDate <= now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    const cleanTitle = cleanTitleOnly(text);
    return { targetDate, hour, minute, cleanTitle };
  };

  const addGoogleEvent = async (text: string) => {
    if (!googleToken) return speak("กรุณาล็อกอินกูเกิลก่อน");
    const { targetDate, hour, minute, cleanTitle } = parseDateTime(text);
    if (hour === -1 || hour > 23) return speak("บอกเวลาให้ชัดเจนด้วย");
    const pad = (n: number) => n.toString().padStart(2, '0');

    try {
      // build proper start/end using Date so we correctly roll over past midnight
      const start = new Date(targetDate);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      const format = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+07:00`;

      const startTimeISO = format(start);
      const endTimeISO = format(end);

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST", headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: cleanTitle || "นัดหมาย TrueX", start: { dateTime: startTimeISO, timeZone: "Asia/Bangkok" }, end: { dateTime: endTimeISO, timeZone: "Asia/Bangkok" } }),
      });
      if (res.ok) { 
        speak(`บันทึกนัด ${cleanTitle} ตอน ${pad(hour)} นาฬิกา ${minute > 0 ? minute + ' นาที' : ''} เรียบร้อยแล้วค่ะ`); 
        fetchGoogleEvents(googleToken); 
      }
    } catch (err) { console.error(err); }
  };

  const deleteGoogleEvent = async (text: string) => {
    if (!googleToken) return speak("กรุณาล็อกอินกูเกิลก่อน");
    const { targetDate, hour, minute, cleanTitle } = parseDateTime(text);
    if (hour === -1 || hour > 23) return speak("บอกเวลาให้ชัดเจนด้วย");
    // build ISO and search local events for a match
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(hour)}:${pad(minute)}:00+07:00`;
    let eventToDelete = events.find(e => {
      const evDate = new Date(e.full_date);
      return evDate.getTime() === new Date(startISO).getTime() && e.title.includes(cleanTitle);
    });
    if (!eventToDelete && cleanTitle) {
      // if no match by title, look for any event at that time
      eventToDelete = events.find(e => new Date(e.full_date).getTime() === new Date(startISO).getTime());
    }
    if (!eventToDelete) return speak("ไม่พบเหตุการณ์ที่ต้องการยกเลิก");
    try {
      const del = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventToDelete.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (del.ok) {
        setEvents(events.filter(e => e.id !== eventToDelete.id));
        speak(`ยกเลิกนัด${cleanTitle}เรียบร้อยแล้ว`);
      } else {
        speak("ลบไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const speakEventsForDate = (date: Date) => {
    // determine relative label (วันนี้/พรุ่งนี้/มะรืนนี้/หรือวันที่ dd)
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    let label = `วันที่ ${date.getDate()}`;
    if (toYMD(date) === toYMD(now)) label = 'วันนี้';
    else {
      const tmr = new Date(now);
      tmr.setDate(now.getDate() + 1);
      if (toYMD(date) === toYMD(tmr)) label = 'พรุ่งนี้';
      else {
        const after = new Date(now);
        after.setDate(now.getDate() + 2);
        if (toYMD(date) === toYMD(after)) label = 'มะรืนนี้';
      }
    }

    // filter by matching year-month-day
    const targetYMD = toYMD(date);
    const matches = events.filter(e => {
      const ev = new Date(e.full_date);
      return toYMD(ev) === targetYMD;
    });

    if (matches.length === 0) {
      speak(`${label}ไม่มีนัด`);
    } else {
      const parts = matches.map(e => {
        const ev = new Date(e.full_date);
        const time = ev.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${e.title} เวลา ${time}`;
      });
      const prefix = `${label}คุณมีนัด${matches.length > 1 ? 'รายการดังนี้ ' : ' '}`;
      speak(prefix + parts.join(' และ '));
    }
  };

  const handleVoiceCommand = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("ลบ") || t.includes("ยกเลิก")) {
      deleteGoogleEvent(text);
    } else if (t.includes("มีนัด") || t.includes("นัดอะไร") || t.includes("เช็ค")) {
      // if the phrase contains a date word, parse it
      if (t.includes("วันนี้") || t.includes("พรุ่งนี้") || t.includes("มะรืน") || /\d/.test(t)) {
        const { targetDate } = parseDateTime(text);
        speakEventsForDate(targetDate);
      } else {
        // no specific date, return upcoming event(s)
        if (events.length === 0) {
          speak("ยังไม่มีนัดหมาย");
        } else {
          const next = events[0];
          speak(`นัดถัดไปคือ ${next.title} เวลา ${next.event_time}`);
        }
      }
    } else if (t.includes("เพิ่ม") || t.includes("จอง") || t.includes("นัด")) {
      addGoogleEvent(text);
    } else if (t.includes("อากาศ") || t.includes("วิเคราะห์")) {
      handleAnalyze();
    }
  };

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      // browser doesn’t support speech recognition (e.g. Safari on Mac/iOS).
      // fall back to a simple text prompt so the app still works everywhere.
      const typed = window.prompt("ดูเหมือนเบราว์เซอร์ของคุณไม่รองรับการพูด ถ้าต้องการสั่งงาน ให้พิมพ์คำสั่งลงไป:");
      if (typed) handleVoiceCommand(typed);
      return;
    }
    const rec = new Recognition();
    rec.lang = "th-TH";
    rec.onresult = (e: any) => handleVoiceCommand(e.results[0][0].transcript);
    rec.onerror = () => {
      // if recognition fails, let user type instead
      const fallback = window.prompt("เกิดข้อผิดพลาดในการฟังเสียง โปรดพิมพ์คำสั่งแทน:");
      if (fallback) handleVoiceCommand(fallback);
    };
    rec.start();
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aqi, temp: weather.temp, desc: weather.desc, nextEvent: events[0]?.title }), });
      const data = await res.json();
      setAiAdvice(data.analysis.replace(/ครับ|ค่ะ/g, "")); speak(data.analysis);
    } catch { setAiAdvice("ระบบขัดข้อง"); }
    finally { setIsLoading(false); }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;

    // proactively check permission status (Chrome, Edge, Firefox)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(status => {
        if (status.state === 'denied') {
          speak('ระบบต้องการตำแหน่งของคุณ กรุณาอนุญาตในเบราว์เซอร์');
        }
      }).catch(() => {});
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        try {
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          const d = await res.json();
          setWeather({ temp: d.temp, desc: d.desc, city: d.city });
          setAqi(d.aqi);
        } catch (err) {
          console.error('weather fetch failed', err);
        }
      },
      (err) => {
        console.warn('geolocation error', err);
        // show user message if denied
        if (err.code === err.PERMISSION_DENIED) {
          speak('ไม่สามารถดึงตำแหน่งได้ ถ้าต้องการข้อมูลฝุ่นกรุณาอนุญาตตำแหน่ง');
        }
      }
    );
  };

  useEffect(() => {
    // detect speech recognition availability
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!Recognition);

    setIsMounted(true);
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) { setGoogleToken(token); fetchGoogleEvents(token); window.history.replaceState(null, "", window.location.pathname); }
    }

    // ask for location immediately on dashboard load
    requestLocation();
  }, [fetchGoogleEvents]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0c0f14] text-white font-sans selection:bg-red-500 overflow-x-hidden">
      <nav className="flex items-center justify-between p-4 bg-[#0f1720]/90 sticky top-0 z-50 border-b border-red-900/30 backdrop-blur-md">
        <h1 className="text-xl font-black italic text-red-500 uppercase tracking-tighter">TrueX</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/login')} className="bg-red-600/20 text-red-500 border border-red-500/30 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-red-900/20 to-transparent border border-red-900/30 shadow-2xl">
            <p className="text-red-400 uppercase text-[9px] font-black tracking-widest mb-1">Current Location</p>
            <h2 className="text-2xl font-black">{weather.city}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-[2.5rem] bg-[#111418] border border-red-900/20 flex flex-col items-center justify-center">
              <p className="text-red-400 uppercase text-[9px] font-black tracking-widest mb-1">AQI Index</p>
              <h2 className="text-4xl font-black text-red-500">{aqi}</h2>
            </div>
            <div className="p-5 rounded-[2.5rem] bg-[#111418] border border-white/5 flex flex-col items-center justify-center">
              <p className="text-white/40 uppercase text-[9px] font-black tracking-widest mb-1">Temperature</p>
              <h2 className="text-4xl font-black">{weather.temp}°C</h2>
            </div>
          </div>

          <button
            onClick={startListening}
            disabled={!voiceSupported}
            className={`w-full py-10 rounded-[3rem] text-2xl font-black shadow-[0_20px_40px_rgba(220,38,38,0.3)] active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-red-800 ${voiceSupported ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gray-600 cursor-not-allowed'}`}
            title={voiceSupported ? 'พูดกับ TrueX' : 'เบราว์เซอร์ไม่รองรับการสั่งด้วยเสียง'}
          >
            <span className="text-4xl">🎙️</span> {voiceSupported ? 'พูดกับ TrueX' : 'สั่งด้วยข้อความได้'}
          </button>

          <div className="bg-[#111418] border border-red-900/20 p-8 rounded-[3rem] shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-red-900/20 pb-4">
              <h3 className="text-red-400 uppercase text-[10px] font-black tracking-widest">Upcoming Schedule</h3>
            </div>

            <div className="space-y-3">
              {!googleToken ? (
                <div className="py-10 flex flex-col items-center text-center space-y-6">
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-white/80">ยังไม่พบนัดหมาย</p>
                    <p className="text-xs text-white/30">กรุณาเข้าสู่ระบบ Google เพื่อจัดการตารางเวลา</p>
                  </div>
                  <button onClick={syncGoogleCalendar} className="flex items-center gap-4 bg-white text-black px-10 py-5 rounded-[2rem] font-black text-lg shadow-[0_15px_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105 active:scale-95">
                    <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" className="w-6 h-6" alt="" />
                    LOGIN GOOGLE CALENDAR
                  </button>
                </div>
              ) : events.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/20 italic">ยังไม่มีนัดหมายในเร็วๆ นี้</div>
              ) : (
                events.map(e => (
                  <div key={e.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5 group transition-all">
                    <p className="font-bold text-lg group-hover:text-red-400">{e.title}</p>
                    <div className="bg-red-600/10 text-red-500 px-4 py-2 rounded-xl font-black text-[10px]">{e.event_time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0f1216] border border-red-900/30 p-8 rounded-[3rem] self-start md:sticky md:top-28 shadow-2xl backdrop-blur-xl">
          <h3 className="text-red-500 text-[9px] font-black uppercase mb-6 border-b border-red-900/20 pb-4 tracking-widest">AI Intelligence</h3>
          <p className="text-lg leading-relaxed italic text-white/80">“{aiAdvice}”</p>
        </div>
      </main>
    </div>
  );
}