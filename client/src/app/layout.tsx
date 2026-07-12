import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "AssetFlow",
  description: "Enterprise Asset & Resource Management System",
=======
  title: "TrackAssets",
  description: "TrackAssets Asset Management Platform",
>>>>>>> cdd4f7f (add sign up and login page)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
<<<<<<< HEAD
      <body className="bg-gray-50 text-gray-900">{children}</body>
=======
      <body className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)]">
        {children}
      </body>
>>>>>>> cdd4f7f (add sign up and login page)
    </html>
  );
}
