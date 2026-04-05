import { Poppins } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/common.css";
import "@/styles/main.css";
import "@/styles/responsive.css";
import BootstrapClient from "@/components/BootstrapClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Buddy Script",
  description: "A social network for developers",
  icons: {
    icon: '/images/logo-copy.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        {/* <BootstrapClient /> */}
        <ToastProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

