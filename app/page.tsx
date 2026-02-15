import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#140202] via-[#1a0507] to-black flex flex-col items-center justify-center p-8 text-white">
      
      <header className="mb-12 text-center">
        <h1 className="text-6xl font-black text-red-500 mb-3 tracking-tight">
          True<span className="text-white">X</span>
        </h1>
        <p className="text-xl text-red-300/80 font-light tracking-wide">
          Smart Home AI Solution
        </p>
      </header>
      
      <main className="flex flex-col gap-5 w-full max-w-sm">
        
        <Link
          href="/login"
          className="bg-gradient-to-r from-red-600 to-red-700 
          text-white text-center py-4 rounded-full font-bold 
          shadow-xl hover:from-red-500 hover:to-red-600 
          hover:shadow-red-500/40 
          transition-all duration-300 active:scale-95"
        >
          เข้าสู่ระบบ
        </Link>

        <Link
          href="/register"
          className="bg-red-900/30 backdrop-blur 
          text-red-300 text-center py-4 rounded-full font-bold 
          border border-red-500/40 
          hover:bg-red-800/40 
          transition-all duration-300 active:scale-95"
        >
          สมัครสมาชิกใหม่
        </Link>

      </main>

      <footer className="mt-20 text-red-400/60 text-xs tracking-widest uppercase">
        © 2026 TrueX Project - Powered by Supabase
      </footer>

    </div>
  );
}
