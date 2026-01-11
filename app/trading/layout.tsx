import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Dashboard",
  description: "View and analyze stock data",
};

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
