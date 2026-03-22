"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

export default function HomePage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let w, h;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      dx: (Math.random() - 0.5) * 0.0002,
      dy: (Math.random() - 0.5) * 0.0002,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

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
    <div style={{ background: "#0a0b0f", minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#fff", overflowX: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", background: "rgba(10,11,15,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>F</div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>FinGuard</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", color: "#8b92a5", fontSize: 14, textDecoration: "none" }}>
            Log in
          </Link>
          <Link href="/signup" style={{ padding: "8px 20px", borderRadius: 8, background: "#6366f1", color: "#fff", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", marginBottom: 32, fontSize: 12, color: "#a5b4fc", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
          Prophet · Monte Carlo · Rule Engine
        </div>

        <h1 style={{ fontSize: "clamp(42px, 7vw, 88px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 24, maxWidth: 900 }}>
          Your finances,{" "}
          <span style={{ background: "linear-gradient(135deg,#6366f1 0%,#ec4899 60%,#f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            intelligently
          </span>{" "}
          predicted.
        </h1>

        <p style={{ fontSize: 18, color: "#8b92a5", maxWidth: 560, lineHeight: 1.7, marginBottom: 48 }}>
          Upload your bank statements and get rule-based advisories, Prophet-powered forecasts, and Monte Carlo risk simulations — all in one dashboard.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/dashboard" style={{ padding: "14px 32px", borderRadius: 10, background: "#6366f1", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none", letterSpacing: "-0.01em" }}>
            Go to Dashboard →
          </Link>
          <Link href="/signup" style={{ padding: "14px 32px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 15, textDecoration: "none" }}>
            Create account
          </Link>
        </div>

        {/* Stat bar */}
        <div style={{ marginTop: 80, display: "flex", gap: 0, borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "Simulations per run", value: "1,000" },
            { label: "Forecast horizon", value: "6 months" },
            { label: "Risk metrics", value: "VaR · CVaR · MDD" },
            { label: "Model", value: "Facebook Prophet" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 32px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#8b92a5", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 48px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, color: "#6366f1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>What&apos;s inside</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Four layers of financial intelligence</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{ padding: "32px 28px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = f.color + "55"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
            >
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at top right, ${f.color}18, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ fontSize: 22, marginBottom: 16, color: f.color }}>{f.icon}</div>
              <div style={{ display: "inline-block", fontSize: 10, padding: "3px 8px", borderRadius: 4, background: f.color + "22", color: f.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>{f.tag}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: f.color, marginBottom: 12, fontWeight: 500 }}>{f.subtitle}</p>
              <p style={{ fontSize: 14, color: "#8b92a5", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 24px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 40px", borderRadius: 24, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)" }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 }}>Ready to take control?</h2>
          <p style={{ color: "#8b92a5", marginBottom: 32, lineHeight: 1.7 }}>Upload your first CSV and get your financial risk profile in under 60 seconds.</p>
          <Link href="/signup" style={{ padding: "14px 36px", borderRadius: 10, background: "#6366f1", color: "#fff", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
            Start for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>F</div>
          <span style={{ fontSize: 14, color: "#8b92a5" }}>FinGuard — Personal Finance Intelligence</span>
        </div>
        <div style={{ fontSize: 13, color: "#4b5563" }}>
          Built with Next.js · FastAPI · Prophet · PostgreSQL
        </div>
      </footer>
    </div>
  );
}