import type { Metadata } from "next";
import "./globals.css";
import ReduxProvider from "../store/ReduxProvider";
import { ChatProvider } from "../context/ChatContext";
import { AuthProvider } from "../context/AuthContext";
import { EmailVerificationGate } from "../components/auth/EmailVerificationGate";

export const metadata: Metadata = {
  title: "AGGARLY by Lona — Nocturnal Sanctuaries & Lumen AI Concierge",
  description:
    "Where moonlight unveils the secluded sanctuaries. Architectural pavilions tuned precisely to the lunar cycle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-sans antialiased bg-white text-[#221B14]">
        <AuthProvider>
          <EmailVerificationGate />
          <ReduxProvider>
            <ChatProvider>{children}</ChatProvider>
          </ReduxProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


