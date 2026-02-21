import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrueX | Smart Home IoT Dashboard",
  description: "สัมผัสประสบการณ์การใช้ชีวิตอัจฉริยะ วิเคราะห์สภาพอากาศและพลังงานด้วย TrueX AI",
  metadataBase: new URL('https://truex-iot-dashboard.vercel.app'),
  
  openGraph: {
    title: "TrueX | Smart Home IoT Dashboard",
    description: "ระบบจัดการบ้านอัจฉริยะ วิเคราะห์สภาพอากาศและประหยัดพลังงานแบบ Real-time",
    url: "https://truex-iot-dashboard.vercel.app",
    siteName: "TrueX Smart Living",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "TrueX Smart Home Dashboard Preview",
      },
    ],
    locale: "th_TH",
    type: "website",
  },

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
      <body className={inter.className}>
        {/* ⚡ ลบ AuthProvider ออกแล้ว เพื่อล้าง Error CLIENT_FETCH_ERROR */}
        {children}
      </body>
    </html>
  );
}