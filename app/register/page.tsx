'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name: username }),
      });

      if (res.ok) {
        alert('สมัครสมาชิกเรียบร้อย!');
        router.push('/login');
      } else {
        alert('การลงทะเบียนขัดข้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0b0b] p-6 font-sans">
      
      {/* Red Glow Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-red-900/30 relative z-10">
        
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black text-red-400 italic tracking-tighter mb-3 drop-shadow-[0_0_15px_rgba(248,113,113,0.35)]">
            TrueX
          </h1>
          <div className="inline-block px-4 py-1 bg-red-500/10 rounded-full border border-red-500/20">
            <p className="text-red-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              Become a Member
            </p>
          </div>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-5">
          
          <input
            type="text"
            placeholder="Choose Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-5 rounded-2xl bg-slate-800/50 border-2 border-transparent focus:border-red-500 focus:bg-slate-800 outline-none text-white font-semibold transition-all placeholder:text-slate-600 shadow-inner"
            required
          />
          
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-5 rounded-2xl bg-slate-800/50 border-2 border-transparent focus:border-red-500 focus:bg-slate-800 outline-none text-white font-semibold transition-all placeholder:text-slate-600 shadow-inner"
            required
          />
          
          <button 
            disabled={isLoading}
            className={`w-full p-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] mt-4
              ${isLoading 
                ? 'bg-slate-700 cursor-not-allowed text-slate-500' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.35)]'
              }`}
          >
            {isLoading ? "PROCESSING..." : "REGISTER"}
          </button>
        </form>

        <div className="mt-10 text-center">
          <a 
            href="/login" 
            className="text-slate-500 text-xs font-black hover:text-red-400 transition-colors uppercase tracking-wider"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
