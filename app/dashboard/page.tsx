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

      if (lowerText.includes("วิเคราะห์")) {
        handleAnalyze();
        speak("กำลังวิเคราะห์ข้อมูลให้ครับ");
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
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleVoiceCommand(transcript);
    };

    recognition.start();
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
    if (isMounted) {
      setName(localStorage.getItem('userName') || "User");
      fetchData();
    }
  }, [isMounted, fetchData]);

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

  const logout = () => {
    localStorage.removeItem('userName');
    window.location.href = '/login';
  };

  if (!isMounted) return null;

  /* ================= UI (ของคุณเหมือนเดิมทั้งหมด) ================= */

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

              const report = `
              สวัสดีค่ะ คุณ ${name}

              ตอนนี้ ที่ ${weather.city}
              อุณหภูมิ อยู่ที่ ${weather.temp} องศาเซลเซียส
              สภาพอากาศ ${weather.desc}

              ค่าคุณภาพอากาศ หรือ เอคิวไอ อยู่ที่ ${aqi}
              ซึ่งอยู่ในระดับ ${aqiStyle.label}

              ${
                aqi <= 50
                  ? "อากาศดีมาก สามารถทำกิจกรรมกลางแจ้งได้ตามปกติค่ะ"
                  : aqi <= 100
                  ? "อากาศปานกลาง หากต้องอยู่กลางแจ้งนาน ควรสวมหน้ากากค่ะ"
                  : aqi <= 150
                  ? "เริ่มมีผลกระทบต่อสุขภาพ ควรลดเวลาทำกิจกรรมกลางแจ้งค่ะ"
                  : "คุณภาพอากาศไม่ดีต่อสุขภาพ ควรหลีกเลี่ยงกิจกรรมกลางแจ้งค่ะ"
              }
              `;

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
