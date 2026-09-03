import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recall Kanban",
  description: "Turn customer calls into evidence-backed support tickets.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
