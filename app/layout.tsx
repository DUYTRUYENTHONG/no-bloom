import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "No-bloom happy vietnamese woman days | NỞ",
  description: "Một lời chúc nhỏ, một đóa hoa dành riêng cho bạn nhân ngày Phụ nữ Việt Nam.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
