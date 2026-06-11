import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/presentation/store/AppProvider";
import { ThemeProvider } from "@/presentation/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinanceHub",
  description: "Secure Ledger and Budget Allocation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppProvider>
            {children}
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}