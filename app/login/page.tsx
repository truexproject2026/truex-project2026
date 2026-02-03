'use client';
import { useState } from 'react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

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
        alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-red-600 italic tracking-tighter mb-2">TrueX</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Smart Living Starts Here</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-4 italic">Identity</span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-red-500 focus:bg-white outline-none text-slate-900 font-bold transition-all placeholder:text-slate-300"
              required
            />
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-4 italic">Security</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-red-500 focus:bg-white outline-none text-slate-900 font-bold transition-all placeholder:text-slate-300"
              required
            />
          </div>
          
          <button 
            disabled={isLoading}
            className={`w-full p-6 rounded-[1.5rem] font-black text-xl shadow-xl transition-all active:scale-95 mt-6 flex justify-center items-center gap-3
              ${isLoading ? 'bg-slate-300' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-100'}`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "SIGN IN"}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <a href="/register" className="text-slate-400 text-sm font-bold hover:text-red-600 transition-colors italic">
            Create new account →
          </a>
        </div>
      </div>
    </div>
  );
}