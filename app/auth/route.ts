import { NextResponse } from "next/server";

export async function GET() {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const redirect_uri = "http://localhost:3000/dashboard"; // ต้องตรงกับใน Google Console
  const scope = "openid email profile https://www.googleapis.com/auth/calendar.events.readonly";
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;
  
  return NextResponse.redirect(url);
}