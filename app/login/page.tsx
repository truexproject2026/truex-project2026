'use client';
import { useState } from 'react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        localStorage.setItem('userName', data.user.name || data.user.username);
        document.cookie = "isLoggedIn=true; path=/; max-age=86400; SameSite=Lax";
        window.location.href = '/dashboard';
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
    <div className="min-h-screen flex items-center justify-center bg-[#0f0b0b] p-6 font-sans">
      
      {/* Background Red Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-red-900/30 relative z-10">
        
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black text-red-400 italic tracking-tighter mb-3 drop-shadow-[0_0_15px_rgba(248,113,113,0.35)]">
            True x
          </h1>
          <div className="inline-block px-4 py-1 bg-red-500/10 rounded-full border border-red-500/20">
            <p className="text-red-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              Secure Access Portal
            </p>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-4 rounded-2xl text-center">
              {errorMsg}
            </div>
          )}

          <div className="group space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-5 tracking-[0.2em] transition-colors group-focus-within:text-red-400">
              Identity
            </label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-5 rounded-2xl bg-slate-800/50 border-2 border-transparent focus:border-red-500 focus:bg-slate-800 outline-none text-white font-semibold transition-all placeholder:text-slate-600 shadow-inner"
              required
            />
          </div>
          
          <div className="group space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-5 tracking-[0.2em] transition-colors group-focus-within:text-red-400">
              Security
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-5 rounded-2xl bg-slate-800/50 border-2 border-transparent focus:border-red-500 focus:bg-slate-800 outline-none text-white font-semibold transition-all placeholder:text-slate-600 shadow-inner"
              required
            />
          </div>
          
          <button 
            disabled={isLoading}
            className={`w-full p-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-3 overflow-hidden relative
              ${isLoading 
                ? 'bg-slate-700 cursor-not-allowed text-slate-500' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.35)]'
              }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Verifying...
              </span>
            ) : (
              "ACCESS SYSTEM"
            )}
          </button>
        </form>
        
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="h-[1px] w-1/4 bg-red-900/30"></div>
          <a 
            href="/register" 
            className="text-slate-500 text-xs font-black hover:text-red-400 transition-colors tracking-tighter flex items-center gap-2 uppercase"
          >
            Create new node →
          </a>
        </div>
      </div>
    </div>
  );
}
