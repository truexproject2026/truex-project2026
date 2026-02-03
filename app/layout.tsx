import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ⚡ นี่คือส่วนสำคัญที่ทำให้ส่งลิงก์แล้วมีรูปพรีวิวสวยๆ
export const metadata: Metadata = {
  title: "TrueX | Smart Home IoT Dashboard",
  description: "สัมผัสประสบการณ์การใช้ชีวิตอัจฉริยะ วิเคราะห์สภาพอากาศและพลังงานด้วย TrueX AI",
  metadataBase: new URL('https://truex-iot-dashboard.vercel.app'), // ใส่ URL เว็บคุณเพื่อให้ Next.js หาที่อยู่รูปเจอ
  
  // 🌐 ส่วนของ Facebook, Line, Discord
  openGraph: {
    title: "TrueX | Smart Home IoT Dashboard",
    description: "ระบบจัดการบ้านอัจฉริยะ วิเคราะห์สภาพอากาศและประหยัดพลังงานแบบ Real-time",
    url: "https://truex-iot-dashboard.vercel.app",
    siteName: "TrueX Smart Living",
    images: [
      {
        url: "/opengraph-image.jpg", // ⚡ ต้องมีไฟล์ชื่อนี้วางอยู่ในโฟลเดอร์ app/ นะครับ
        width: 1200,
        height: 630,
        alt: "TrueX Smart Home Dashboard Preview",
      },
    ],
    locale: "th_TH",
    type: "website",
  },

  // 🐦 ส่วนของ X (Twitter)
  twitter: {
    card: "summary_large_image",
    title: "TrueX | Smart Home IoT Dashboard",
    description: "วิเคราะห์สภาพอากาศและพลังงานอัจฉริยะด้วย TrueX AI",
    images: ["/opengraph-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  );
}