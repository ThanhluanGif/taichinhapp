import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "VNStock Terminal - Nền Tảng Phân Tích & Giao Dịch Chứng Khoán Chuyên Nghiệp",
  description: "Hệ thống phân tích kỹ thuật thông minh, dữ liệu thời gian thực SSI iBoard, radar phát hiện dòng tiền đột biến & quản trị danh mục đầu tư chuẩn thị trường Việt Nam.",
  icons: {
    icon: "/assets/images/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#070A0F] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
