import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "MYCELIA: soil intelligence for regenerative farms", description: "Fields, soil profiles, water, carbon and rotation on a fictional farm. All data is synthetic." };
export const viewport: Viewport = { themeColor: "#18140F", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
