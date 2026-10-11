import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SiteEffects from "../components/SiteEffects";
import { siteUrl } from "../lib/site";
import { themeBootstrapScript } from "../lib/theme";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
        <Header />
        <main>{children}</main>
        <Footer />
        <SiteEffects />
      </body>
    </html>
  );
}
