import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ ต้อง await ตรงนี้

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id); // ✅ ใช้ id ที่ unwrap แล้ว

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'Deleted successfully' },
    { status: 200 }
  );
}
