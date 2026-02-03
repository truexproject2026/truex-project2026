import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <header className="mb-12 text-center">
        <h1 className="text-6xl font-black text-red-600 mb-2 tracking-tighter">True<span className="text-slate-800">X</span></h1>
        <p className="text-xl text-slate-500 font-light">Smart Home AI Solution</p>
      </header>
      
      <main className="flex flex-col gap-4 w-full max-w-sm">
        <Link href="/login" className="bg-red-600 text-white text-center py-4 rounded-full font-bold shadow-lg hover:bg-red-700 transition-all active:scale-95">
          เข้าสู่ระบบ
        </Link>
        <Link href="/register" className="bg-white text-red-600 text-center py-4 rounded-full font-bold shadow-md border-2 border-red-600 hover:bg-red-50 transition-all active:scale-95">
          สมัครสมาชิกใหม่
        </Link>
      </main>

      <footer className="mt-20 text-slate-400 text-xs tracking-widest uppercase">
        © 2026 TrueX Project - Powered by Supabase
      </footer>
    </div>
  );
}