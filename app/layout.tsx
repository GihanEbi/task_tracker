import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { loadWorkTimeState } from "@/lib/scheduling/actions";
import "./worktime.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "WorkTime — Today",
  description: "Time-aware task planning and workload scheduling.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WorkTime",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2D5A8C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { userId } = await auth();
  const initialState = userId ? await loadWorkTimeState() : null;

  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <ClerkProvider>{initialState ? <AppShell initialState={initialState}>{children}</AppShell> : children}</ClerkProvider>
      </body>
    </html>
  );
}