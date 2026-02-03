import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      return NextResponse.json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // ส่งข้อมูลผู้ใช้กลับไป
    return NextResponse.json({ user });
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}