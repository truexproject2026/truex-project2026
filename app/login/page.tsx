'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // ใช้ router ของ Next.js แทน window.location

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter(); // เรียกใช้งาน router

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // เก็บข้อมูลชื่อผู้ใช้
        localStorage.setItem('userName', data.user.name || data.user.username);
        // ตั้งค่า Cookie เพื่อให้ Middleware หรือหน้าอื่นๆ ตรวจสอบสถานะได้
        document.cookie = "isLoggedIn=true; path=/; max-age=86400; SameSite=Lax";
        
        // ใช้ router.push เพื่อความรวดเร็วในการเปลี่ยนหน้า
        router.push('/dashboard');
      } else {
        setErrorMsg('Invalid identity or security key.');
      }
    } catch (err) {
      setErrorMsg('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0b0b] p-6 font-sans relative overflow-hidden">
      
      {/* Background Red Glow - ปรับให้ดูนวลขึ้น */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border border-red-900/20 relative z-10">
        
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black text-red-500 italic tracking-tighter mb-3 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            True x
          </h1>
          <div className="inline-block px-4 py-1 bg-red-500/10 rounded-full border border-red-500/20">
            <p className="text-red-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              Secure Access Portal
            </p>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-4 rounded-2xl text-center animate-shake">
              {errorMsg}
            </div>
          )}

          <div className="group space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-5 tracking-[0.2em] transition-colors group-focus-within:text-red-500">
              Identity
            </label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-5 rounded-2xl bg-slate-800/30 border-2 border-transparent focus:border-red-600/50 focus:bg-slate-800/80 outline-none text-white font-semibold transition-all placeholder:text-slate-700 shadow-inner"
              required
            />
          </div>
          
          <div className="group space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-5 tracking-[0.2em] transition-colors group-focus-within:text-red-500">
              Security
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-5 rounded-2xl bg-slate-800/30 border-2 border-transparent focus:border-red-600/50 focus:bg-slate-800/80 outline-none text-white font-semibold transition-all placeholder:text-slate-700 shadow-inner"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full p-5 rounded-2xl font-black text-lg transition-all active:scale-[0.97] mt-4 flex justify-center items-center gap-3 overflow-hidden relative
              ${isLoading 
                ? 'bg-slate-800 cursor-not-allowed text-slate-600' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_10px_30px_rgba(220,38,38,0.3)]'
              }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                VERIFYING...
              </span>
            ) : (
              "ACCESS SYSTEM"
            )}
          </button>
        </form>
        
        <div className="mt-10 flex flex-col items-center gap-4">
          {/* แก้ไขเป็น h-px เพื่อให้ Tailwind IntelliSense ไม่ขึ้นเตือน */}
          <div className="h-px w-1/4 bg-red-900/30"></div>
          <button 
            onClick={() => router.push('/register')}
            className="text-slate-500 text-xs font-black hover:text-red-400 transition-colors tracking-tighter flex items-center gap-2 uppercase"
          >
            Create new node →
          </button>
        </div>
      </div>
    </div>
  );
}