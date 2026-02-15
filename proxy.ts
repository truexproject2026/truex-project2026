import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// เปลี่ยนชื่อฟังก์ชันจาก middleware เป็น proxy หรือใช้ default
export default function proxy(request: NextRequest) {
  const isLoggedIn = request.cookies.get('isLoggedIn')

  // ถ้าพยายามเข้าหน้า Dashboard แต่ไม่มี Cookie ให้ดีดไปหน้า Login
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}