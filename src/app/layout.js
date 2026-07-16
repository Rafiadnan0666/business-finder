import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Advanced Business Finder - Discover Local Businesses Worldwide",
  description: "Find and discover businesses, shops, restaurants, and services in any location worldwide using OpenStreetMap data.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('appkind_theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                }
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <nav style={{ background: 'var(--fg)', borderBottom: '3px solid var(--border)', padding: '0 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '4px', height: '40px' }}>
            <Link href="/" style={{ color: 'var(--bg)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', textDecoration: 'none', padding: '0 12px', letterSpacing: '0.5px' }}>Business Finder</Link>
            <span style={{ color: 'var(--muted)', fontSize: '10px' }}>|</span>
            <Link href="/osint" style={{ color: 'var(--bg)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', textDecoration: 'none', padding: '0 12px', letterSpacing: '0.5px' }}>OSINT Search</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
