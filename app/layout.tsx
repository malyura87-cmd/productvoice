import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "ProductVoice — AI-відеоопис товару за 30 секунд";
const description =
  "Введіть назву товару й додайте фото — сервіс напише рекламний сценарій, озвучить його і зробить вертикальне відео 9:16 із субтитрами.";

export const metadata: Metadata = {
  metadataBase: new URL("https://productvoice.vercel.app"),
  title,
  description,
  applicationName: "ProductVoice",
  keywords: ["AI відео", "відеоопис товару", "озвучка", "Reels", "TikTok", "Gemini", "ElevenLabs"],
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    siteName: "ProductVoice",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
