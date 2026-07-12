import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackAssets",
  description: "TrackAssets Asset Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
