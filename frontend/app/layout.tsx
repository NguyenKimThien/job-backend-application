import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Việc Làm Thanh Niên Hà Nội",
  description:
    "Nền tảng kết nối người lao động và nhà tuyển dụng tại Hà Nội.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
