import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "중1 사회 교과 빈칸 채우기 평가 시스템 | EduSocial AI",
  description: "비상교육 중학교 사회 ① 교과서 단원별 15문항 빈칸 채우기 평가 및 맞춤형 피드백 웹 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-slate-50 text-slate-800 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
