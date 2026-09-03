import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
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