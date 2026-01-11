import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Track your options trades and manage your wheel strategy",
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
