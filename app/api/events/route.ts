import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================
// GET - ดึงรายการ event ทั้งหมด
// ==========================
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Fetch Error:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: data }, { status: 200 });

  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}


// ==========================
// POST - เพิ่ม event ใหม่
// ==========================
export async function POST(req: Request) {
  try {
    const { title, description, event_date, event_time } = await req.json();

    // ตรวจสอบข้อมูลจำเป็น
    if (!title || !event_date) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title: title.trim(),
          description: description || null,
          event_date,
          event_time: event_time || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Insert Error:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { event: data },
      { status: 201 }
    );

  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}
