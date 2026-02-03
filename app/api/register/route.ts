import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { username, password, name } = await req.json();

    // บันทึกลงตาราง users โดยใช้คอลัมน์ username
    const { data, error } = await supabase
      .from('users')
      .insert([{ 
        username: username, // ต้องชื่อตรงกับใน Supabase
        password: password, 
        name: name 
      }]);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Success' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}