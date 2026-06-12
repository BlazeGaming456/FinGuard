"use client";

import Link from "next/link";
import ParticleBackground from "@/components/ParticleBackground";
import Logo from "@/components/Logo";

export default function HomePage() {
  const features = [
    {
      icon: "▲",
      title: "Smart Dashboard",
      subtitle: "Rule-based advisory engine",
      desc: "Instantly see your monthly income, expenses, savings rate, and category breakdowns. Our rule engine flags risks like high EMI ratios, overspending, and savings shortfalls — no ML required.",
      tag: "Phase 3",
      color: "#22c55e",
    },
    {
      icon: "⬡",
      title: "CSV Upload",
      subtitle: "Automatic field mapping",
      desc: "Upload any bank statement CSV. FinGuard auto-detects date, amount, and category columns, validates entries, handles edge cases, and stores clean data in PostgreSQL.",
      tag: "Phase 2",
      color: "#f59e0b",
    },
    {
      icon: "◈",
      title: "Prophet Forecasting",
      subtitle: "Facebook Prophet · additive model",
      desc: "Time-series forecasting using Meta's Prophet. Trend decomposition, outlier capping via Z-score, and confidence intervals give you a realistic 6-month income and expense outlook.",
      tag: "Phase 4",
      color: "#6366f1",
    },
    {
      icon: "◎",
      title: "Monte Carlo Simulation",
      subtitle: "1,000 simulated futures",
      desc: "Run probabilistic scenarios: job loss survival, big purchase affordability, reduced income risk. Outputs VaR, CVaR, max drawdown, and recovery probability across all simulations.",
      tag: "Phase 5",
      color: "#ec4899",
    },
  ];

  return (
    <div className="relative bg-bg-primary min-h-screen text-text-primary overflow-x-hidden">
      <ParticleBackground />

      <nav className="glass-nav fixed top-0 left-0 right-0 z-[100] px-6 sm:px-12 py-5 flex items-center justify-between">
        <Logo href="/" />
        <div className="flex gap-3">
          <Link href="/login" className="btn-ghost text-sm py-2">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 no-underline">
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent-light text-xs uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Prophet · Monte Carlo · Rule Engine
        </div>

        <h1 className="text-[clamp(42px,7vw,88px)] font-bold tracking-tight leading-[1.05] mb-6 max-w-[900px]">
          Your finances,{" "}
          <span className="gradient-text">intelligently</span>{" "}
          predicted.
        </h1>

        <p className="text-lg text-text-secondary max-w-xl leading-relaxed mb-12">
          Upload your bank statements and get rule-based advisories, Prophet-powered forecasts, and Monte Carlo risk simulations — all in one dashboard.
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/dashboard" className="btn-primary text-[15px] px-8 py-3.5 no-underline">
            Go to Dashboard →
          </Link>
          <Link href="/signup" className="btn-ghost text-[15px] px-8 py-3.5 no-underline">
            Create account
          </Link>
        </div>

        <div className="mt-20 flex flex-wrap justify-center rounded-2xl border border-border overflow-hidden glass-card">
          {[
            { label: "Simulations per run", value: "1,000" },
            { label: "Forecast horizon", value: "6 months" },
            { label: "Risk metrics", value: "VaR · CVaR · MDD" },
            { label: "Model", value: "Facebook Prophet" },
          ].map((s, i) => (
            <div
              key={i}
              className={`px-8 py-5 text-center ${i < 3 ? "border-r border-border" : ""}`}
            >
              <div className="text-xl font-bold tracking-tight">{s.value}</div>
              <div className="text-xs text-text-secondary mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 sm:px-12 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-accent uppercase tracking-[0.1em] mb-3">What&apos;s inside</p>
          <h2 className="text-[clamp(28px,4vw,48px)] font-bold tracking-tight leading-tight">
            Four layers of financial intelligence
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-7 relative overflow-hidden group hover:border-[color:var(--hover-color)] transition-colors duration-300"
              style={{ "--hover-color": f.color + "55" }}
            >
              <div
                className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                style={{ background: `radial-gradient(circle at top right, ${f.color}18, transparent 70%)` }}
              />
              <div className="text-2xl mb-4" style={{ color: f.color }}>{f.icon}</div>
              <div
                className="inline-block text-[10px] px-2 py-0.5 rounded uppercase tracking-widest mb-3"
                style={{ background: f.color + "22", color: f.color }}
              >
                {f.tag}
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-1.5">{f.title}</h3>
              <p className="text-xs font-medium mb-3" style={{ color: f.color }}>{f.subtitle}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 pb-24 text-center">
        <div className="max-w-xl mx-auto px-10 py-14 rounded-3xl border border-accent/20 bg-accent/5">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Ready to take control?</h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Upload your first CSV and get your financial risk profile in under 60 seconds.
          </p>
          <Link href="/signup" className="btn-primary text-[15px] px-9 py-3.5 no-underline">
            Start for free →
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border px-6 sm:px-12 py-8 flex items-center justify-between flex-wrap gap-4">
        <Logo size="sm" />
        <span className="text-sm text-text-secondary hidden sm:inline">
          FinGuard — Personal Finance Intelligence
        </span>
        <div className="text-sm text-text-secondary/60">
          Built with Next.js · FastAPI · Prophet · PostgreSQL
        </div>
      </footer>
    </div>
  );
}
