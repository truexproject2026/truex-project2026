'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {

  const router = useRouter();

  // 🌡 Weather State
  const [temp, setTemp] = useState<string>("--");
  const [city, setCity] = useState<string>("Detecting...");
  const [aqi, setAqi] = useState<number>(0);
  const [desc, setDesc] = useState<string>("");

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

  /* ==========================================
      🌍 GET WEATHER + FORECAST
  ========================================== */
  useEffect(() => {
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

          setTemp(data?.temp ? String(data.temp) : "--");
          setCity(data?.city || "Unknown Area");
          setAqi(data?.aqi || 0);
          setDesc(data?.desc || "");
          setForecast(data?.forecast || []);
          setTrend(data?.trend || {});
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
  }, []);

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

  /* ==========================================
      🎤 VOICE ASSISTANT
  ========================================== */
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

    {/* RED GLOW BACKGROUND EFFECT */}
    <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-red-600/20 blur-[180px] rounded-full" />
    <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-red-800/20 blur-[180px] rounded-full" />

    {/* NAVBAR */}
    <nav className="relative z-10 flex items-center justify-between px-10 py-6 backdrop-blur-xl bg-black/40 border-b border-red-900/40 shadow-[0_0_40px_rgba(255,0,0,0.1)]">
      <h1 className="text-2xl font-black tracking-widest text-red-500 uppercase drop-shadow-lg">
        TrueX
      </h1>
      <div className="text-sm text-white/60 tracking-wide">
        {temp}°C | {city}
      </div>
    </nav>

    <main className="relative z-10 max-w-5xl mx-auto px-8 py-14 flex flex-col gap-8">

      {/* Weather Card */}
      <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl hover:shadow-red-900/30 transition-all duration-500">
        <div className="text-lg font-semibold text-red-400 mb-4">Current Weather</div>
        <div className="grid grid-cols-3 gap-6 text-white/80">
          <div>🌤 {desc}</div>
          <div>🌡 {temp}°C</div>
          <div>🌫 AQI {aqi}</div>
        </div>
      </div>

      {/* Forecast Card */}
      <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl hover:shadow-red-900/30 transition-all duration-500">
        <div className="font-bold text-red-400 mb-4 tracking-wide">5-Day Forecast</div>
        <div className="grid grid-cols-5 gap-4 text-sm text-white/70">
          {forecast.map((d, i) => (
            <div key={i} className="bg-black/40 p-4 rounded-xl border border-red-900/20 text-center">
              <div>{d.date}</div>
              <div className="text-red-400 font-semibold">{d.temp}°C</div>
              <div>Rain {d.rain}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend + Risk Grid */}
      <div className="grid md:grid-cols-2 gap-8">

        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">
          <div className="text-red-400 font-bold mb-4">Weather Trend</div>
          <div className="text-white/70 space-y-2">
            <div>🔥 Hot Days: {trend?.hotDays ?? 0}</div>
            <div>🌧 Heavy Rain Days: {trend?.rainDays ?? 0}</div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl">
          <div className={`text-xl font-bold mb-3 ${riskColor}`}>
            Risk Level: {riskLevel}
          </div>
          <div className="text-white/60 text-sm">
            {riskReason}
          </div>
        </div>

      </div>

      {/* AI Box */}
      <div className="bg-gradient-to-br from-black to-[#111418] p-10 rounded-3xl border border-red-900/30 shadow-[0_0_60px_rgba(255,0,0,0.1)]">
        <p className="text-lg italic text-white/80 leading-relaxed tracking-wide">
          {aiAdvice}
        </p>
      </div>

      {/* BUTTONS */}
      <div className="flex flex-col md:flex-row gap-6">

        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="flex-1 py-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-800 font-bold tracking-wide shadow-lg hover:scale-[1.02] hover:shadow-red-600/40 transition-all duration-300"
        >
          {isLoading ? "Analyzing..." : "Activate TrueX"}
        </button>

        <button
          onClick={startVoiceAssistant}
          className="flex-1 py-6 rounded-2xl bg-black border border-red-600/40 text-red-400 font-bold tracking-wide hover:bg-red-600 hover:text-white transition-all duration-300"
        >
          {isListening
            ? "🎤 Listening..."
            : isSpeaking
            ? "🔊 Speaking..."
            : "🎤 Ask TrueX"}
        </button>

      </div>

    </main>
  </div>
);
}