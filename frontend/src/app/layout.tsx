import type {
  Metadata,
} from "next";

import "./globals.css";


export const metadata: Metadata = {
  title: "RailETA",
  description:
    "Dynamic and leakage-safe ETA forecasting for coaching trains.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}