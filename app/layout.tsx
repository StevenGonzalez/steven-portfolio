import type { Metadata } from "next";
import { Roboto, Roboto_Condensed, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { NavProvider } from "../components/NavProvider";
import RouteTheme from "../components/RouteTheme";

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

export const metadata: Metadata = {
  title: "Steven | Senior Software Engineer",
  description: "Portfolio showcasing projects and software engineering insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoCondensed.variable} ${robotoMono.variable} antialiased bg-white dark:bg-black`}
      >
        <NavProvider>
            <RouteTheme />
            <div className="flex h-svh flex-col overflow-hidden pt-16">
            <Navbar />
            <PageTransition className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</PageTransition>
            <Footer />
            </div>
          </NavProvider>
      </body>
    </html>
  );
}
