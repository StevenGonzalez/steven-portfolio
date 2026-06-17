import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Condensed, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { NavProvider } from "../components/NavProvider";
import RouteTheme from "../components/RouteTheme";
import ParticleField from "../components/ParticleField";
import { siteUrl } from "../lib/site";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const siteDescription =
  "Senior software engineer focused on reliable systems, pragmatic architecture, and software other engineers can safely change.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Steven Gonzalez | Senior Software Engineer",
  description: siteDescription,
  openGraph: {
    type: "website",
    title: "Steven Gonzalez | Senior Software Engineer",
    description: siteDescription,
    siteName: "Steven Gonzalez",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Steven Gonzalez | Senior Software Engineer",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoCondensed.variable} ${robotoMono.variable} bg-white text-zinc-950 antialiased dark:bg-black dark:text-zinc-50`}
      >
        <div className="relative isolate h-svh overflow-x-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,250,250,0.94))] dark:bg-[linear-gradient(180deg,rgba(9,9,11,0.98),rgba(9,9,11,0.94))]">
          <ParticleField />
          <div aria-hidden="true" className="layout-grain" />

          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 inset-x-0 bottom-0 opacity-95"
            style={{
              background:
                "radial-gradient(circle at top center, rgb(var(--accent-rgb) / 0.12), transparent 34%), linear-gradient(180deg, rgb(255 255 255 / 0.18), transparent 32%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-8 h-64"
            style={{
              background:
                "linear-gradient(180deg, rgb(var(--accent-rgb) / 0.1), transparent 74%)",
            }}
          />
          <NavProvider>
            <RouteTheme />
            <div className="relative flex h-svh flex-col">
              <Navbar />
              <PageTransition className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-14">{children}</PageTransition>
              <Footer />
            </div>
          </NavProvider>
        </div>
      </body>
    </html>
  );
}
