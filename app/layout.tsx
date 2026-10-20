import type { Metadata } from "next";
import "./globals.css";
import {TrafficObserver} from "@/components/TrafficObserver";

export const metadata: Metadata = {
  metadataBase: new URL("https://duytruyenthong.github.io/no-bloom/"),
  title: "No-bloom happy vietnamese woman days | NỞ",
  description: "Một lời chúc nhỏ, một đóa hoa dành riêng cho bạn nhân ngày Phụ nữ Việt Nam.",
  referrer: "no-referrer",
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "NỞ",
    url: "https://duytruyenthong.github.io/no-bloom/",
    title: "NỞ — Một đóa hoa dành riêng cho bạn",
    description: "Mở món quà, ngắm hoa nở và nhận một lời chúc dịu dàng nhân ngày 20/10.",
    images: [{ url: "https://duytruyenthong.github.io/no-bloom/share-card.png", width: 1200, height: 630, alt: "NỞ — Một đóa hoa, một lời chúc dành riêng cho bạn." }],
  },
  twitter: {
    card: "summary_large_image", title: "NỞ — Một đóa hoa dành riêng cho bạn",
    description: "Một lời chúc nhỏ, một đóa hoa dành riêng cho bạn nhân ngày 20/10.",
    images: ["https://duytruyenthong.github.io/no-bloom/share-card.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap" />
  </head><body><TrafficObserver />{children}</body></html>;
}
