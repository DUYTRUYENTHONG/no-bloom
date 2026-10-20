import type { Metadata } from "next";
import "./globals.css";
import {TrafficObserver} from "@/components/TrafficObserver";

export const metadata: Metadata = {
  title: "No-bloom happy vietnamese woman days | NỞ",
  description: "Một lời chúc nhỏ, một đóa hoa dành riêng cho bạn nhân ngày Phụ nữ Việt Nam.",
  referrer: "no-referrer",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><TrafficObserver />{children}</body></html>;
}
