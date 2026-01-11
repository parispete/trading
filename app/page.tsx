import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Database, TrendingUp, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Trading Platform
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
          Personal trading support system with historical stock data analysis.
          Built with Next.js 15, DuckDB, and real market data from Tiingo.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/trading">
            <Button size="lg">
              Open Dashboard
              <TrendingUp className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/trading/setup">
            <Button variant="outline" size="lg">
              Setup Guide
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Database className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Local Database</CardTitle>
              <CardDescription>
                DuckDB-powered storage for fast analytical queries on historical
                price data
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Interactive Charts</CardTitle>
              <CardDescription>
                Visualize price history with customizable charts and technical
                indicators
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Watchlists</CardTitle>
              <CardDescription>
                Track your favorite stocks with real-time price updates and
                alerts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Free Data</CardTitle>
              <CardDescription>
                30+ years of historical US stock data via Tiingo&apos;s free API
                tier
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Get up and running in a few simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                Get a free API key from{" "}
                <a
                  href="https://www.tiingo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Tiingo
                </a>
              </li>
              <li>
                Copy <code className="bg-muted px-1 rounded">.env.example</code>{" "}
                to <code className="bg-muted px-1 rounded">.env.local</code> and
                add your API key
              </li>
              <li>
                Run the Python data sourcing script to populate your database
              </li>
              <li>Start the development server and open the dashboard</li>
            </ol>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <code className="text-sm">
                cd data-sourcing && python scripts/setup_database.py
              </code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>
          Built with Next.js 16, React 19, Tailwind CSS, and DuckDB
        </p>
      </footer>
    </div>
  );
}
