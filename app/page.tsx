import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-red-900 flex flex-col items-center justify-center p-8 text-white">
      
      <header className="mb-12 text-center">
        <h1 className="text-6xl font-black text-red-400 mb-2 tracking-tighter">
          True<span className="text-white">X</span>
        </h1>
        <p className="text-xl text-red-300 font-light">
          Smart Home AI Solution
        </p>
      </header>
      
      <main className="flex flex-col gap-4 w-full max-w-sm">
        <Link 
          href="/login" 
          className="bg-red-500 text-white text-center py-4 rounded-full font-bold shadow-[0_0_25px_rgba(255,0,0,0.6)] hover:bg-red-600 transition-all active:scale-95"
        >
          เข้าสู่ระบบ
        </Link>

        <Link 
          href="/register" 
          className="bg-red-900 text-red-200 text-center py-4 rounded-full font-bold border border-red-500 hover:bg-red-800 transition-all active:scale-95"
        >
          สมัครสมาชิกใหม่
        </Link>
      </main>

      <footer className="mt-20 text-red-400 text-xs tracking-widest uppercase">
        © 2026 TrueX Project - Powered by Supabase
      </footer>

    </div>
  );
}
