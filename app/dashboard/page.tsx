'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wind, Mic } from "lucide-react";
export default function Dashboard() {

  const router = useRouter();

  // 🌡 Weather State
  const [temp, setTemp] = useState<string>("--");
  const [city, setCity] = useState<string>("Detecting...");
  const [aqi, setAqi] = useState<number>(0);
  const [desc, setDesc] = useState<string>("");

  //  PM2.5 State
  const [pm25, setPm25] = useState<number>(0);
  const [purifierStatus, setPurifierStatus] = useState<string>("OFF");
  
  // 📅 Forecast State
  const [forecast, setForecast] = useState<any[]>([]);
  const [trend, setTrend] = useState<any>({});

  // 🧠 AI State
  const [aiAdvice, setAiAdvice] = useState(
    "Press the button below to activate TrueX AI."
  );
  const [riskLevel, setRiskLevel] = useState<string>("ต่ำ");
  const [riskReason, setRiskReason] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [nextEvent, setNextEvent] = useState<string>("ไม่มีนัดหมาย");


  //  GET WEATHER + FORECAST 
  useEffect(() => {

    const fetchWeather = () => {

      if (!navigator.geolocation) {
        setCity("Location Unsupported");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {

          const { latitude, longitude } = position.coords;

          try {

            const res = await fetch(
              `/api/weather?lat=${latitude}&lon=${longitude}`
            );

            const data = await res.json();
            console.log("Weather update:", new Date().toLocaleTimeString(), data);

            setTemp(data?.temp ? String(data.temp) : "--");
            setCity(data?.city || "Unknown Area");
            setAqi(data?.aqi || 0);
            setDesc(data?.desc || "");
            setForecast(data?.forecast || []);
            setTrend(data?.trend || {});
            setPm25(data?.pm25 || 0);

          } catch {

            setTemp("--");
            setCity("Weather Unavailable");

          }

        },
        () => {
          setCity("Permission Denied");
          setTemp("--");
        }
      );

    };

    fetchWeather(); // โหลดครั้งแรก

    const interval = setInterval(fetchWeather, 10000); // ทุก 10 วิ

    return () => clearInterval(interval);

  }, []);

  /* ==========================================
      🤖 AUTO CONTROL AIR PURIFIER
  ========================================== */
  useEffect(() => {

    const autoControl = async () => {

      let status = "OFF";

      if (pm25 > 50) {
        status = "ON";
      }

      try {

        const res = await fetch("/api/device/airpurifier", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        });

        const data = await res.json();
        setPurifierStatus(data.status);

      } catch {}

    };

    autoControl();

  }, [pm25]);


  /* ==========================================
      🌫 MANUAL CONTROL
  ========================================== */
  const controlPurifier = async () => {

    let status = "OFF";

    if (pm25 > 50) {
      status = "ON";
    }

    try {
      const res = await fetch("/api/device/airpurifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      setPurifierStatus(data.status);

    } catch {
      alert("Device connection error");
    }
  };

  /* ==========================================
      🧠 ANALYZE
  ========================================== */
  const handleAnalyze = async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp: temp === "--" ? 0 : Number(temp),
          aqi,
          desc,
          city,
          nextEvent,
          forecast,
          trend,
        }),
      });

      const data = await res.json();

      setAiAdvice(data?.analysis || "No response.");
      setRiskLevel(data?.meta?.riskLevel || "ต่ำ");
      setRiskReason(data?.meta?.riskReason || "");

    } catch {
      setAiAdvice("System error.");
    } finally {
      setIsLoading(false);
    }
  };
      // VOICE ASSISTANT

  const startVoiceAssistant = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Browser does not support voice recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "th-TH";
    recognition.start();

    setIsListening(true);
    setAiAdvice("Listening...");

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      const command = transcript.toLowerCase();
          if (command.includes("เปิดเครื่องกรอง")) {

      await fetch("/api/device/airpurifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ON" })
      });

      setPurifierStatus("ON");

      const speech = new SpeechSynthesisUtterance("เปิดเครื่องกรองอากาศแล้วครับ");
      speech.lang = "th-TH";
      window.speechSynthesis.speak(speech);

      return;
    }
        if (command.includes("ปิดเครื่องกรอง")) {

      await fetch("/api/device/airpurifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OFF" })
      });

      setPurifierStatus("OFF");

      const speech = new SpeechSynthesisUtterance("ปิดเครื่องกรองอากาศแล้วครับ");
      speech.lang = "th-TH";
      window.speechSynthesis.speak(speech);

      return;
    }

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: transcript,
            temp: temp === "--" ? 0 : Number(temp),
            aqi,
            desc,
            city,
            nextEvent,
            forecast,
            trend,
          }),
        });

        const data = await res.json();
        const reply = data?.analysis || "No AI response.";

        setAiAdvice(reply);
        setRiskLevel(data?.meta?.riskLevel || "ต่ำ");
        setRiskReason(data?.meta?.riskReason || "");

        const speech = new SpeechSynthesisUtterance(reply);
        speech.lang = "th-TH";

        setIsSpeaking(true);
        window.speechSynthesis.speak(speech);
        speech.onend = () => setIsSpeaking(false);

      } catch {
        setAiAdvice("Voice AI Error.");
      }

      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setAiAdvice("Voice recognition error.");
    };
  };

  const riskColor =
    riskLevel === "สูง"
      ? "text-red-500"
      : riskLevel === "ปานกลาง"
      ? "text-yellow-400"
      : "text-green-400";

return (
<div className="min-h-screen bg-gradient-to-br from-black via-[#0c0f14] to-black text-white font-sans relative overflow-hidden">

  {/* Background glow */}
  <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-red-600/20 blur-[180px] rounded-full" />
  <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-red-800/20 blur-[180px] rounded-full" />

  {/* NAVBAR */}
  <nav className="relative z-10 flex items-center justify-between px-10 py-6 backdrop-blur-xl bg-black/40 border-b border-red-900/40 shadow-[0_0_40px_rgba(255,0,0,0.1)]">
    <h1 className="text-2xl font-black tracking-widest text-red-500 uppercase">
      TrueX
    </h1>

    <div className="text-sm text-white/60 tracking-wide">
      {temp ?? 0}°C | {city ?? "-"}
    </div>
  </nav>

  {/* MAIN DASHBOARD */}
  <main className="relative z-10 max-w-7xl mx-auto px-8 py-14 grid lg:grid-cols-4 md:grid-cols-2 gap-8">

    {/* CURRENT WEATHER */}
    <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">
      <div className="text-lg font-semibold text-red-400 mb-4">
        Current Weather
      </div>

      <div className="space-y-3 text-white/80">
        <div>🌤 {desc ?? "-"}</div>
        <div>🌡 {temp ?? 0}°C</div>
        <div>🌫 AQI {aqi ?? 0}</div>
      </div>
    </div>

    {/* PM2.5 CONTROL */}
    <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">

      <div className="text-red-400 font-bold mb-6">
        PM2.5 Air Control
      </div>

      <div className="flex flex-col gap-3">

        <div className="text-3xl font-bold text-white">
          {pm25 ?? 0}
          <span className="text-sm text-white/60 ml-2">µg/m³</span>
        </div>

        <div className="text-xs text-white/60">
          Real-time air quality monitoring
        </div>

        <div
          className={`text-sm font-semibold ${
            pm25 > 100
              ? "text-red-500"
              : pm25 > 50
              ? "text-orange-400"
              : pm25 > 25
              ? "text-yellow-400"
              : "text-green-400"
          }`}
        >
          {pm25 > 100
            ? "Hazardous Air"
            : pm25 > 50
            ? "Unhealthy"
            : pm25 > 25
            ? "Moderate"
            : "Good Air"}
        </div>

        <div className="text-xs text-white/70 mt-2">
          Air Purifier : {purifierStatus ?? "OFF"}
        </div>

      </div>

    </div>

    {/* WEATHER TREND */}
    <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">

      <div className="text-red-400 font-bold mb-4">
        Weather Trend
      </div>

      <div className="space-y-2 text-white/70">
        <div>🔥 Hot Days: {trend?.hotDays ?? 0}</div>
        <div>🌧 Rain Days: {trend?.rainDays ?? 0}</div>
      </div>

    </div>

    {/* RISK LEVEL */}
    <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">

      <div className={`text-xl font-bold mb-3 ${riskColor ?? "text-white"}`}>
        Risk Level: {riskLevel ?? "-"}
      </div>

      <div className="text-white/60 text-sm">
        {riskReason ?? "-"}
      </div>

    </div>

    {/* FORECAST */}
    <div className="lg:col-span-4 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">

      <div className="font-bold text-red-400 mb-6 tracking-wide">
        5 Day Forecast
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        {(forecast ?? []).map((d, i) => (
          <div
            key={i}
            className="bg-black/40 p-5 rounded-xl border border-red-900/20 text-center"
          >
            <div className="text-white/70 text-sm">
              {d.date}
            </div>

            <div className="text-red-400 font-semibold text-lg">
              {d.temp}°C
            </div>

            <div className="text-xs text-white/60">
              Rain {d.rain}%
            </div>

          </div>
        ))}

      </div>

    </div>

    {/* AI ADVICE */}
    <div className="lg:col-span-4 bg-gradient-to-br from-black to-[#111418] p-10 rounded-3xl border border-red-900/30 shadow-[0_0_60px_rgba(255,0,0,0.1)]">

      <p className="text-lg italic text-white/80 leading-relaxed">
        {aiAdvice ?? "-"}
      </p>

    </div>

    {/* CONTROL BUTTONS */}
<div className="lg:col-span-4 flex flex-col md:flex-row gap-6">

  <button
    onClick={handleAnalyze}
    disabled={isLoading}
    className="flex-1 py-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-800 font-bold tracking-wide shadow-lg hover:scale-[1.02] hover:shadow-red-600/40 transition-all duration-300"
  >
    {isLoading ? "Analyzing..." : "Activate TrueX"}
  </button>

    <button
      onClick={startVoiceAssistant}
      className="flex-1 py-6 rounded-2xl bg-black border border-red-600/40 text-red-400 font-bold tracking-wide hover:bg-red-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-4"
    >

      {/* Voice Orb */}
      <div className="relative w-10 h-10 flex items-center justify-center">

        {(isListening || isSpeaking) && (
          <div className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 blur-lg animate-pulse opacity-70"></div>
        )}

        <div
          className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
          ${
            isListening || isSpeaking
              ? "bg-gradient-to-r from-red-500 via-rose-500 to-pink-500"
              : "bg-red-600"
          }`}
        >
          <Mic size={16} className="text-white" />
        </div>

      </div>

      <span>
        {isListening
          ? "Listening..."
          : isSpeaking
          ? "Speaking..."
          : "Ask TrueX"}
      </span>

    </button>

  </div>

  </main>

  {/* DEVICE */}
  <div className="absolute right-10 top-40 z-20 flex flex-col items-center gap-2">

    <div
      className={`w-24 h-36 rounded-xl border flex items-center justify-center transition-all duration-500
      ${
        purifierStatus === "ON"
          ? "bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_25px_rgba(34,197,94,0.6)]"
          : "bg-gray-600/20 border-gray-500 text-gray-400"
      }`}
    >

      <Wind
        size={42}
        className={purifierStatus === "ON" ? "animate-spin" : ""}
      />

    </div>

    <div className="text-xs text-white/70">
      {purifierStatus === "ON"
        ? "Purifier Running"
        : "Purifier Off"}
    </div>

  </div>

</div>
);
}