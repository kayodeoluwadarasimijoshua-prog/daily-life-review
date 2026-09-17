import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: { default: "Daily Life Review", template: "%s | Daily Life Review" },
  description:
    "A gentle journaling companion that turns your daily notes into weekly insights — mood trends, themes, wins and gentle suggestions.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#6c5ce7",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
