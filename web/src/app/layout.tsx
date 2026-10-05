import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/store/app-provider";
import { Toaster } from "@/components/shell/toaster";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "HRIS Internal",
  description: "Timesheet, cuti, lembur, reimburse, payroll, sales, dan project.",
};

// Terapkan theme tersimpan sebelum render untuk menghindari kedipan.
const themeScript = `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
