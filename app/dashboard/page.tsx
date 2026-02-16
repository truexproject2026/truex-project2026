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
  const [events, setEvents] = useState<any[]>([]);
  const [notifiedEvents, setNotifiedEvents] = useState<string[]>([]);

  /* ================= SPEAK ================= */

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const thaiVoice =
      voices.find(v => v.lang === "th-TH") ||
      voices.find(v => v.lang.includes("th"));

    if (thaiVoice) utterance.voice = thaiVoice;

    utterance.lang = "th-TH";
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);
  };

  /* ================= VOICE COMMAND ================= */

    const handleVoiceCommand = (text: string) => {
      const lowerText = text.toLowerCase().trim();

      console.log("ได้ยินว่า:", lowerText);

      const wakePatterns = [
        "ทรู",
        "ทู",
        "true",
        "เอ็ก",
        "เอ็กซ์",
        "เอก"
      ];

      const hasWakeWord = wakePatterns.some(word =>
        lowerText.includes(word)
      );

      const hasGreeting =
        lowerText.includes("สวัสดี") ||
        lowerText.includes("หวัดดี") ||
        lowerText.includes("hello");

      // 🔥 ถ้ามีคำทักทาย + มีคำใกล้เคียงทรูเอ็กซ์
      if (hasWakeWord && hasGreeting) {
        speak(`ครับ คุณ ${name} มีอะไรให้ผมช่วย`);
        return;
      }

      if (lowerText.includes("อากาศ")) {
        speak(`
          ตอนนี้ที่ ${weather.city}
          อุณหภูมิ ${weather.temp} องศา
          ค่าเอคิวไอ ${aqi}
          อยู่ในระดับ ${aqiStyle.label}
        `);
        return;
      }
    // ===== ถามว่าวันนี้มีนัดอะไร =====
      if (
          lowerText.includes("มีนัด") ||
          lowerText.includes("นัดอะไร") ||
          lowerText.includes("นัดบ้าง")
        ) {
           handleAskEvents();
            return;
    }
      if (lowerText.includes("วิเคราะห์")) {
        handleAnalyze();
        speak("กำลังวิเคราะห์ข้อมูลให้ครับ");
        return;
      }
      // ===== เพิ่มนัดด้วยเสียง =====
    if (
      lowerText.includes("นัด") ||
      lowerText.includes("เพิ่มนัด") ||
      lowerText.includes("จอง")
    ) {
      handleCreateEventFromVoiceNatural(lowerText);
      return;
    }

    // ===== ยกเลิกนัด =====
    if (
      lowerText.includes("ยกเลิก") ||
      lowerText.includes("ลบนัด")
    ) {
      handleCancelEventFromVoice(lowerText);
      return;
    }

    // ===== เปลี่ยนวัน/เวลา =====
    if (
      lowerText.includes("เปลี่ยน") ||
      lowerText.includes("เลื่อน")
    ) {
      handleUpdateEventFromVoice(lowerText);
      return;
    }

      speak("ขออภัยครับ ผมยังไม่เข้าใจคำสั่ง");
    };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("เบราว์เซอร์นี้ไม่รองรับการสั่งงานด้วยเสียง");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "th-TH";
    recognition.interimResults = false;
    const newLocal = recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleVoiceCommand(transcript);
    };

    recognition.start();
  };

      const handleAskEvents = () => {
      const now = new Date();

      const upcoming = events
        .map((event) => ({
          ...event,
          eventDateTime: new Date(
            `${event.event_date}T${event.event_time}`
          ),
        }))
        .filter(
          (event) => event.eventDateTime.getTime() > now.getTime()
        )
        .sort(
          (a, b) =>
            a.eventDateTime.getTime() -
            b.eventDateTime.getTime()
        );

      if (upcoming.length === 0) {
        speak("ตอนนี้คุณไม่มีนัดที่กำลังจะมาถึงครับ");
        return;
      }

      // เอาแค่นัดถัดไป
      const next = upcoming[0];

      const time = next.eventDateTime.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });

      speak(`นัดถัดไปของคุณคือ ${next.title} เวลา ${time} ครับ`);
    };

  /* ================= AQI STYLE ================= */

  const aqiStyle = useMemo(() => {
    if (aqi <= 50)
      return { dot: "bg-green-500", text: "text-green-400", border: "border-green-500/40", bg: "", glow: "", label: "อากาศดีมาก" };
    if (aqi <= 100)
      return { dot: "bg-yellow-400", text: "text-yellow-400", border: "border-yellow-500/40", bg: "", glow: "", label: "ปานกลาง" };
    if (aqi <= 150)
      return { dot: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/40", bg: "", glow: "", label: "เริ่มมีผลกระทบ" };
    if (aqi <= 200)
      return { dot: "bg-red-600", text: "text-red-500", border: "border-red-500/40", bg: "", glow: "", label: "ไม่ดีต่อสุขภาพ" };

    return { dot: "bg-purple-700", text: "text-purple-500", border: "border-purple-600/40", bg: "", glow: "", label: "อันตรายมาก" };
  }, [aqi]);

  /* ================= FETCH DATA ================= */

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (weatherCache && now - weatherCache.timestamp < CACHE_DURATION) {
      setWeather(weatherCache.data.weather);
      setAqi(weatherCache.data.aqi);
      return;
    }

    const res = await fetch(`/api/weather?lat=13.75&lon=100.50`);
    const data = await res.json();

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
  }, []);   

  /* ================= EFFECTS ================= */

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

    useEffect(() => {
      if (!isMounted) return;

      setName(localStorage.getItem('userName') || "User");
      fetchData();

      fetch('/api/events')
        .then(res => res.json())
        .then(data => {
          setEvents(data.events || []);
        })
        .catch(() => setEvents([]));

    }, [isMounted, fetchData]);

    const upcomingEvents = useMemo(() => {
      const now = new Date();

      return events
        .map((event) => {
        const eventDateTime = new Date(
          `${event.event_date}T${event.event_time}`
        );
          return { ...event, eventDateTime };
        })
        .filter((event) => event.eventDateTime.getTime() > now.getTime())
        .sort(
          (a, b) =>
            a.eventDateTime.getTime() - b.eventDateTime.getTime()
        );
    }, [events, currentTime]);

    useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date();

        events.forEach((event) => {
        const eventDateTime = new Date(
          `${event.event_date}T${event.event_time}`
        );
          const diff = eventDateTime.getTime() - now.getTime();

          // 🔔 เตือนก่อน 30 วิ
          if (
            diff <= 30000 &&
            diff > 0 &&
            !notifiedEvents.includes(event.id)
          ) {
            speak(`อย่าลืมนะครับ คุณมีนัด ${event.title}`);
            setNotifiedEvents((prev) => [...prev, event.id]);
          }
        });
      }, 1000); // เช็คทุก 1 วิ ให้ real จริง

      return () => clearInterval(interval);
    }, [events, notifiedEvents]);

  /* ================= ANALYZE ================= */

  const handleAnalyze = async () => {
    setIsLoading(true);
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

    const handleCreateEventFromVoiceNatural = async (text: string) => {
      try {
        let eventDate = "";
        let eventTime = "";
        const today = new Date();

        // ===== 📅 จัดการวัน =====
        if (text.includes("พรุ่งนี้")) {
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          eventDate = tomorrow.toISOString().split("T")[0];
        } else if (text.includes("วันนี้")) {
          eventDate = today.toISOString().split("T")[0];
        }

    if (text.includes("บ่าย")) {
   
      const hourMatch = text.match(/\b([1-9]|1[0-2])\b/);

      if (hourMatch) {
        let hour = parseInt(hourMatch[0]);

        if (hour < 12) {
          hour += 12;
        }

        let minute = 0;

        // 🔥 ถ้ามีคำว่า "ครึ่ง"
        if (text.includes("ครึ่ง")) {
          minute = 30;
        } else {
          // 🔥 หาเลขนาทีแบบยืดหยุ่น
          const minuteMatch = text.match(/(\d{1,2})(?=\s*นาที|\b)/g);

          if (minuteMatch && minuteMatch.length > 1) {
            const parsedMinute = parseInt(minuteMatch[1]);

            if (parsedMinute >= 0 && parsedMinute <= 59) {
              minute = parsedMinute;
            }
          }
        }
        eventTime = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
      }
    }

         const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(eventTime);
          if (!isValidTime) {
            speak("เวลาที่ระบุไม่ถูกต้องครับ");
            return;
          }

        const timeMatch = text.match(/\d{1,2}[:.]\d{2}/);
        if (timeMatch) {
          eventTime = timeMatch[0].replace(".", ":");
        }

        let cleanTitle = text
          .replace(
            /สวัสดี|ทรูเอ็กซ์|ทรูเอ็ก|เพิ่มนัด|นัด|จอง|พรุ่งนี้|วันนี้|เช้า|บ่าย|โมง|ให้หน่อย/gi,
            ""
          )
          .replace(/[:\-]/g, "")
          .trim();

        if (!eventDate || !eventTime || !cleanTitle) {
          speak("ผมยังเข้าใจวันเวลาหรือรายละเอียดไม่ครบครับ");
          return;
        }

        // ===== 🔥 ส่งไป backend =====
        const res = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: cleanTitle,
            event_date: eventDate,
            event_time: eventTime,
          }),
        });

        if (!res.ok) {
          speak("บันทึกไม่สำเร็จครับ");
          return;
        }
    const result = await res.json();
    setEvents((prev) => [...prev, result.event]);
        speak(
          `บันทึกนัด ${cleanTitle} วันที่ ${eventDate} เวลา ${eventTime} เรียบร้อยแล้วครับ`
        );
      } catch (error) {
        console.error(error);
        speak("เกิดข้อผิดพลาดในการเพิ่มนัดครับ");
      }
    };

    const handleCancelEventFromVoice = async (text: string) => {
      const keyword = text
        .replace(/ยกเลิก|ลบนัด|นัด/gi, "")
        .trim();

      const found = events.find(event =>
        event.title.includes(keyword)
      );

      if (!found) {
        speak("ไม่พบนัดที่ต้องการยกเลิกครับ");
        return;
      }

      try {
        await fetch(`/api/events/${found.id}`, {
          method: "DELETE",
        });

        setEvents(prev =>
          prev.filter(event => event.id !== found.id)
        );

        speak(`ยกเลิกนัด ${found.title} เรียบร้อยแล้วครับ`);
      } catch {
        speak("เกิดข้อผิดพลาดในการยกเลิกนัดครับ");
      }
    };

    const handleUpdateEventFromVoice = async (text: string) => {
      const found = events.find(event =>
        text.includes(event.title)
      );

      if (!found) {
        speak("ไม่พบนัดที่ต้องการเปลี่ยนครับ");
        return;
      }

      let newDate = found.event_date;
      let newTime = found.event_time;

      const today = new Date();

      if (text.includes("พรุ่งนี้")) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        newDate = tomorrow.toISOString().split("T")[0];
      }

      const hourMatch = text.match(/\d+/);
      if (text.includes("บ่าย") && hourMatch) {
        const hour = parseInt(hourMatch[0]) + 12;
        newTime = `${hour.toString().padStart(2, "0")}:00`;
      }

      try {
        await fetch(`/api/events/${found.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_date: newDate,
            event_time: newTime,
          }),
        });

        setEvents(prev =>
          prev.map(event =>
            event.id === found.id
              ? { ...event, event_date: newDate, event_time: newTime }
              : event
          )
        );

        speak(`เลื่อนนัด ${found.title} เรียบร้อยแล้วครับ`);
      } catch {
        speak("เกิดข้อผิดพลาดในการเปลี่ยนนัดครับ");
      }
    };

      const logout = () => {
        localStorage.removeItem('userName');
        window.location.href = '/login';
      };
      

  
  if (!isMounted) return null;

// UI
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
                {currentTime.toLocaleTimeString()}
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
            onClick={startListening}
            className="bg-black border border-red-500 text-red-500 px-6 py-3 rounded-xl hover:bg-red-600 hover:text-white transition"
          >
            🎙 พูดกับ TrueX
          </button>

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
          onClick={() => {
            handleAnalyze();
            const report = `...`;
            speak(report);
          }}
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

        {/* ================= EVENTS SECTION ================= */}
    <div className="bg-[#111418] p-8 rounded-[1.5rem] border border-red-900/30 shadow-lg">

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-red-400 text-sm uppercase tracking-[0.3em] italic">
          Upcoming Events
        </h3>
      </div>
      {upcomingEvents.length === 0 ? (
        <p className="text-white/50 text-sm">ยังไม่มีอีเวนต์</p>
      ) : (
        <div className="space-y-4">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-black/40 rounded-xl border border-red-800/20"
            >
              <p className="font-bold text-white">{event.title}</p>
              <p className="text-sm text-white/60 mt-1">
                {event.event_date} • {event.event_time}
              </p>
            </div>
          ))}
        </div>
  )}
</div>
        {/* ================================================== */}
      </div>
        <div className="bg-gradient-to-br from-[#111418] to-[#0f0f12] 
        p-10 rounded-[2rem] 
        text-white flex flex-col justify-between 
        shadow-xl min-h-[400px] 
        border border-red-900/30 
        relative overflow-hidden
        self-start">

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
      </div>
    </main>
    </div>
  );
}
