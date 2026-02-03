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
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
        <div className="mb-10 text-right">
          <h1 className="text-4xl font-black text-red-600 italic tracking-tighter mb-2">TrueX</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Become a member</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Choose Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-red-500 focus:bg-white outline-none text-slate-900 font-bold transition-all"
            required
          />
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-red-500 focus:bg-white outline-none text-slate-900 font-bold transition-all"
            required
          />
          <button 
            disabled={isLoading}
            className="w-full bg-slate-900 text-white p-6 rounded-[1.5rem] font-black text-xl shadow-xl hover:bg-black active:scale-95 transition-all mt-4 disabled:bg-slate-300"
          >
            {isLoading ? "PROCESSING..." : "REGISTER"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/login" className="text-slate-400 text-sm font-bold hover:text-red-600 transition-colors italic">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}