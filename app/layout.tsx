import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SiteEffects from "../components/SiteEffects";
import { siteUrl } from "../lib/site";
import { themeBootstrapScript } from "../lib/theme";

// The fonts are Google Fonts' Latin files, kept in the repo. next/font/google fetched them from Google on every build,
// and a deploy failed when Google answered in a URL format that next/font could not read.
const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "./fonts/cormorant-garamond.woff2", weight: "500 600", style: "normal" },
    { path: "./fonts/cormorant-garamond-italic.woff2", weight: "500 600", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const schibsted = localFont({
  variable: "--font-schibsted",
  src: "./fonts/schibsted-grotesk.woff2",
  weight: "400 600",
  display: "swap",
});

const plexMono = localFont({
  variable: "--font-plex-mono",
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500" },
  ],
  display: "swap",
});

const siteDescription =
  "Steven Gonzalez is a software engineer who builds web apps and the real-time systems behind them, in TypeScript, React, Angular and .NET.";

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
  colorScheme: "light dark",
  // theme-color is deliberately not declared here. It has to change when a
  // visitor overrides the OS, and a tag React renders cannot be edited from
  // outside React's tree. lib/theme.ts owns it instead.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The bootstrap script sets data-theme here before React hydrates, so this
    // element legitimately carries an attribute the server never rendered. The
    // server cannot know the stored choice, and the only way to learn it server
    // side is a cookie, which would make every page dynamic to save an
    // attribute. suppressHydrationWarning covers this element's own attributes
    // and nothing below it, so the only thing it can hide is lang and
    // data-theme.
    //
    // The font variables sit on <html> because the tokens that use them are
    // declared on :root. data-scroll-behavior lets Next turn smooth scrolling
    // off while it moves between routes, so a new page starts at its top.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${schibsted.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <SiteEffects />
      </body>
    </html>
  );
}
