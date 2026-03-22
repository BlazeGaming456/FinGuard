'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts'

const tooltipStyle = {
  backgroundColor: '#1e2130',
  border: '1px solid #2a2d3e',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '12px'
}

const severityConfig = {
  high: { bg: 'bg-danger/5 border-danger/20', text: 'text-danger', icon: '⚠' },
  medium: {
    bg: 'bg-warning/5 border-warning/20',
    text: 'text-warning',
    icon: '◈'
  },
  low: { bg: 'bg-success/5 border-success/20', text: 'text-success', icon: '✓' }
}

const defaultForm = {
  current_savings: 50000,
  horizon: 6,
  job_loss_months: 0,
  target_purchase: 0,
  target_months: 6,
  high_spending_multiplier: 1.3,
  reduced_income_multiplier: 0.5,
  n_simulations: 1000
}

export default function SimulatePage () {
  const [form, setForm] = useState(defaultForm)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const runSimulation = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          current_savings: Number(form.current_savings),
          horizon: Number(form.horizon),
          job_loss_months: Number(form.job_loss_months),
          target_purchase: Number(form.target_purchase),
          target_months: Number(form.target_months),
          high_spending_multiplier: Number(form.high_spending_multiplier),
          reduced_income_multiplier: Number(form.reduced_income_multiplier),
          n_simulations: Number(form.n_simulations)
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Simulation failed')
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Build fan chart data from sample paths
  const fanChartData = data
    ? Array.from({ length: data.horizon_months }, (_, i) => {
        const monthVals = data.sample_paths.map(path => path[i])
        return {
          month: `M${i + 1}`,
          p5: Math.round(data.normal.percentiles.p5),
          p25: Math.round(data.normal.percentiles.p25),
          p50: Math.round(data.normal.percentiles.p50),
          p75: Math.round(data.normal.percentiles.p75),
          p95: Math.round(data.normal.percentiles.p95),
          median: Math.round(
            monthVals.sort((a, b) => a - b)[Math.floor(monthVals.length / 2)]
          )
        }
      })
    : []

  // Scenario comparison chart data
  const scenarioData = data
    ? [
        {
          scenario: 'Normal',
          value: Math.round(data.scenario_comparison.normal),
          color: '#6366f1'
        },
        {
          scenario: 'High Spending',
          value: Math.round(data.scenario_comparison.high_spending),
          color: '#f59e0b'
        },
        {
          scenario: 'Reduced Income',
          value: Math.round(data.scenario_comparison.reduced_income),
          color: '#ef4444'
        },
        {
          scenario: 'Job Loss',
          value: Math.round(data.scenario_comparison.job_loss),
          color: '#8b92a5'
        }
      ]
    : []

  // Affordability timeline
  const affordData =
    data?.affordability_timeline?.map(r => ({
      month: `Month ${r.month}`,
      probability: Math.round(r.probability * 100)
    })) ?? []

  const m = data?.normal

  return (
    <div className='min-h-screen bg-bg-primary text-text-primary p-6 space-y-6'>
      {/* ── Header ── */}
      <div>
        <h1 className='text-xl font-semibold'>Monte Carlo Simulation</h1>
        <p className='text-text-secondary text-sm mt-0.5'>
          1,000 simulated financial futures based on your transaction history
        </p>
      </div>

      {/* ── Input panel + results side by side on large screens ── */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Input panel */}
        <div className='lg:col-span-1 space-y-4'>
          <div className='bg-bg-card border border-border rounded-xl p-5'>
            <p className='text-text-primary font-medium text-sm mb-4'>
              Simulation Parameters
            </p>

            <div className='space-y-4'>
              {/* Current savings */}
              <div>
                <label className='text-text-secondary text-xs block mb-1.5'>
                  Current Savings (₹)
                </label>
                <input
                  type='number'
                  value={form.current_savings}
                  onChange={e => update('current_savings', e.target.value)}
                  className='w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent'
                />
              </div>

              {/* Horizon */}
              <div>
                <label className='text-text-secondary text-xs block mb-1.5'>
                  Forecast Horizon: {form.horizon} months
                </label>
                <input
                  type='range'
                  min={1}
                  max={12}
                  step={1}
                  value={form.horizon}
                  onChange={e => update('horizon', e.target.value)}
                  className='w-full accent-indigo-500'
                />
                <div className='flex justify-between text-text-secondary text-xs mt-1'>
                  <span>1</span>
                  <span>12</span>
                </div>
              </div>

              {/* Simulations */}
              <div>
                <label className='text-text-secondary text-xs block mb-1.5'>
                  Simulations: {Number(form.n_simulations).toLocaleString()}
                </label>
                <input
                  type='range'
                  min={100}
                  max={5000}
                  step={100}
                  value={form.n_simulations}
                  onChange={e => update('n_simulations', e.target.value)}
                  className='w-full accent-indigo-500'
                />
                <div className='flex justify-between text-text-secondary text-xs mt-1'>
                  <span>100</span>
                  <span>5,000</span>
                </div>
              </div>

              <div className='border-t border-border pt-4'>
                <p className='text-text-secondary text-xs uppercase tracking-widest mb-3'>
                  Scenarios
                </p>

                {/* Job loss */}
                <div className='mb-3'>
                  <label className='text-text-secondary text-xs block mb-1.5'>
                    Job Loss Duration: {form.job_loss_months} months
                  </label>
                  <input
                    type='range'
                    min={0}
                    max={12}
                    step={1}
                    value={form.job_loss_months}
                    onChange={e => update('job_loss_months', e.target.value)}
                    className='w-full accent-indigo-500'
                  />
                  <div className='flex justify-between text-text-secondary text-xs mt-1'>
                    <span>None</span>
                    <span>12 months</span>
                  </div>
                </div>

                {/* High spending multiplier */}
                <div className='mb-3'>
                  <label className='text-text-secondary text-xs block mb-1.5'>
                    High Spending: {form.high_spending_multiplier}× normal
                  </label>
                  <input
                    type='range'
                    min={1.0}
                    max={3.0}
                    step={0.1}
                    value={form.high_spending_multiplier}
                    onChange={e =>
                      update('high_spending_multiplier', e.target.value)
                    }
                    className='w-full accent-indigo-500'
                  />
                  <div className='flex justify-between text-text-secondary text-xs mt-1'>
                    <span>1×</span>
                    <span>3×</span>
                  </div>
                </div>

                {/* Reduced income multiplier */}
                <div>
                  <label className='text-text-secondary text-xs block mb-1.5'>
                    Reduced Income:{' '}
                    {Math.round(form.reduced_income_multiplier * 100)}% of
                    normal
                  </label>
                  <input
                    type='range'
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={form.reduced_income_multiplier}
                    onChange={e =>
                      update('reduced_income_multiplier', e.target.value)
                    }
                    className='w-full accent-indigo-500'
                  />
                  <div className='flex justify-between text-text-secondary text-xs mt-1'>
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className='border-t border-border pt-4'>
                <p className='text-text-secondary text-xs uppercase tracking-widest mb-3'>
                  Big Purchase
                </p>
                <div className='mb-3'>
                  <label className='text-text-secondary text-xs block mb-1.5'>
                    Target Amount (₹)
                  </label>
                  <input
                    type='number'
                    value={form.target_purchase}
                    onChange={e => update('target_purchase', e.target.value)}
                    placeholder='e.g. 80000'
                    className='w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent'
                  />
                </div>
                <div>
                  <label className='text-text-secondary text-xs block mb-1.5'>
                    Target Month: {form.target_months}
                  </label>
                  <input
                    type='range'
                    min={1}
                    max={12}
                    step={1}
                    value={form.target_months}
                    onChange={e => update('target_months', e.target.value)}
                    className='w-full accent-indigo-500'
                  />
                </div>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className='w-full mt-5 py-2.5 bg-accent hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors'
            >
              {loading ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Running {Number(form.n_simulations).toLocaleString()}{' '}
                  simulations...
                </span>
              ) : (
                'Run Simulation'
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className='lg:col-span-2 space-y-4'>
          {error && (
            <div className='bg-danger/10 border border-danger/30 rounded-xl p-4'>
              <p className='text-danger text-sm'>⚠ {error}</p>
              <p className='text-text-secondary text-xs mt-1'>
                Make sure your ML server is running and you have 6+ months of
                data
              </p>
            </div>
          )}

          {!data && !loading && !error && (
            <div className='flex items-center justify-center h-64 bg-bg-card border border-border rounded-xl'>
              <div className='text-center'>
                <p className='text-4xl mb-3'>⚡</p>
                <p className='text-text-primary text-sm font-medium'>
                  Configure and run your simulation
                </p>
                <p className='text-text-secondary text-xs mt-1'>
                  Set your parameters on the left and click Run
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className='flex items-center justify-center h-64 bg-bg-card border border-border rounded-xl'>
              <div className='flex flex-col items-center gap-3'>
                <div className='w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin' />
                <p className='text-text-secondary text-sm'>
                  Running {Number(form.n_simulations).toLocaleString()}{' '}
                  simulations...
                </p>
                <p className='text-text-secondary text-xs'>
                  This may take a few seconds
                </p>
              </div>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Risk metric cards */}
              <div className='grid grid-cols-2 gap-3'>
                {[
                  {
                    label: 'Median Savings',
                    value: `₹${Math.round(m.percentiles.p50).toLocaleString()}`,
                    sub: `after ${data.horizon_months} months`,
                    color: 'text-accent',
                    dot: 'bg-accent'
                  },
                  {
                    label: 'Risk of Deficit',
                    value: `${(m.risk_of_deficit * 100).toFixed(1)}%`,
                    sub: 'probability of going negative',
                    color:
                      m.risk_of_deficit > 0.3
                        ? 'text-danger'
                        : m.risk_of_deficit > 0.1
                        ? 'text-warning'
                        : 'text-success',
                    dot:
                      m.risk_of_deficit > 0.3
                        ? 'bg-danger'
                        : m.risk_of_deficit > 0.1
                        ? 'bg-warning'
                        : 'bg-success'
                  },
                  {
                    label: '95% Value at Risk',
                    value: `₹${Math.round(m.var_95).toLocaleString()}`,
                    sub: 'max expected loss at 95% confidence',
                    color: 'text-warning',
                    dot: 'bg-warning'
                  },
                  {
                    label: 'CVaR (Worst 5%)',
                    value: `₹${Math.round(m.cvar_95).toLocaleString()}`,
                    sub: 'avg loss in worst scenarios',
                    color: 'text-danger',
                    dot: 'bg-danger'
                  },
                  {
                    label: 'Max Drawdown',
                    value: `₹${Math.round(m.worst_drawdown).toLocaleString()}`,
                    sub: 'peak-to-trough drop',
                    color: 'text-warning',
                    dot: 'bg-warning'
                  },
                  {
                    label: 'Recovery Rate',
                    value: `${(m.recovery_probability * 100).toFixed(0)}%`,
                    sub: 'of negative scenarios recover',
                    color: 'text-success',
                    dot: 'bg-success'
                  }
                ].map((card, i) => (
                  <div
                    key={i}
                    className='bg-bg-card border border-border rounded-xl p-4'
                  >
                    <div className='flex items-center gap-2 mb-2'>
                      <div className={`w-2 h-2 rounded-full ${card.dot}`} />
                      <p className='text-text-secondary text-xs'>
                        {card.label}
                      </p>
                    </div>
                    <p className={`text-xl font-semibold ${card.color}`}>
                      {card.value}
                    </p>
                    <p className='text-text-secondary text-xs mt-1'>
                      {card.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Percentile bands chart */}
              <div className='bg-bg-card border border-border rounded-xl p-5'>
                <p className='text-text-primary font-medium text-sm mb-1'>
                  Savings Distribution Over Time
                </p>
                <p className='text-text-secondary text-xs mb-5'>
                  Percentile bands from {data.n_simulations.toLocaleString()}{' '}
                  simulations
                </p>
                <ResponsiveContainer width='100%' height={220}>
                  <LineChart data={fanChartData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' />
                    <XAxis
                      dataKey='month'
                      tick={{ fill: '#8b92a5', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#8b92a5', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={v => [`₹${v?.toLocaleString()}`]}
                    />
                    <Line
                      dataKey='p95'
                      stroke='#22c55e'
                      strokeWidth={1.5}
                      strokeDasharray='4 2'
                      dot={false}
                      name='p95 (best)'
                    />
                    <Line
                      dataKey='p75'
                      stroke='#6366f1'
                      strokeWidth={1}
                      strokeDasharray='4 2'
                      dot={false}
                      name='p75'
                    />
                    <Line
                      dataKey='median'
                      stroke='#ffffff'
                      strokeWidth={2}
                      dot={false}
                      name='Median'
                    />
                    <Line
                      dataKey='p25'
                      stroke='#f59e0b'
                      strokeWidth={1}
                      strokeDasharray='4 2'
                      dot={false}
                      name='p25'
                    />
                    <Line
                      dataKey='p5'
                      stroke='#ef4444'
                      strokeWidth={1.5}
                      strokeDasharray='4 2'
                      dot={false}
                      name='p5 (worst)'
                    />
                    <Legend
                      wrapperStyle={{ color: '#8b92a5', fontSize: '11px' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Scenario comparison */}
              <div className='bg-bg-card border border-border rounded-xl p-5'>
                <p className='text-text-primary font-medium text-sm mb-1'>
                  Scenario Comparison
                </p>
                <p className='text-text-secondary text-xs mb-5'>
                  Median savings outcome by scenario
                </p>
                <ResponsiveContainer width='100%' height={180}>
                  <BarChart data={scenarioData} layout='vertical'>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke='#2a2d3e'
                      horizontal={false}
                    />
                    <XAxis
                      type='number'
                      tick={{ fill: '#8b92a5', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type='category'
                      dataKey='scenario'
                      tick={{ fill: '#8b92a5', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={v => [`₹${v?.toLocaleString()}`]}
                    />
                    <Bar dataKey='value' radius={[0, 4, 4, 0]} fill='#6366f1' />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Affordability timeline */}
              {affordData.length > 0 && form.target_purchase > 0 && (
                <div className='bg-bg-card border border-border rounded-xl p-5'>
                  <p className='text-text-primary font-medium text-sm mb-1'>
                    Affordability Timeline — ₹
                    {Number(form.target_purchase).toLocaleString()}
                  </p>
                  <p className='text-text-secondary text-xs mb-5'>
                    Probability of affording target purchase by each month
                  </p>
                  <ResponsiveContainer width='100%' height={160}>
                    <BarChart data={affordData}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' />
                      <XAxis
                        dataKey='month'
                        tick={{ fill: '#8b92a5', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#8b92a5', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `${v}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={v => [`${v}%`, 'Probability']}
                      />
                      <Bar
                        dataKey='probability'
                        fill='#6366f1'
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Emergency fund + safe spend */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='bg-bg-card border border-border rounded-xl p-5'>
                  <p className='text-text-secondary text-xs uppercase tracking-widest mb-3'>
                    Emergency Fund
                  </p>
                  <p className='text-text-primary text-2xl font-semibold'>
                    ₹{Math.round(data.emergency_fund.target).toLocaleString()}
                  </p>
                  <p className='text-text-secondary text-xs mt-1'>
                    6 months of avg expenses
                  </p>
                  {data.emergency_fund.gap > 0 && (
                    <>
                      <div className='mt-3 bg-bg-secondary rounded-full h-2'>
                        <div
                          className='bg-accent h-2 rounded-full'
                          style={{
                            width: `${Math.min(
                              ((data.emergency_fund.target -
                                data.emergency_fund.gap) /
                                data.emergency_fund.target) *
                                100,
                              100
                            )}%`
                          }}
                        />
                      </div>
                      <p className='text-text-secondary text-xs mt-2'>
                        Gap: ₹
                        {Math.round(data.emergency_fund.gap).toLocaleString()}
                        {data.emergency_fund.months_to_reach &&
                          ` · ${data.emergency_fund.months_to_reach} months to reach`}
                      </p>
                    </>
                  )}
                  {data.emergency_fund.gap === 0 && (
                    <p className='text-success text-xs mt-2'>
                      ✓ Emergency fund already covered
                    </p>
                  )}
                </div>

                <div className='bg-bg-card border border-border rounded-xl p-5'>
                  <p className='text-text-secondary text-xs uppercase tracking-widest mb-3'>
                    Safe Extra Spend
                  </p>
                  <p className='text-success text-2xl font-semibold'>
                    ₹{Math.round(data.safe_extra_spend).toLocaleString()}
                  </p>
                  <p className='text-text-secondary text-xs mt-1'>
                    per month while keeping deficit risk &lt;20%
                  </p>
                  <div className='mt-3 p-2 bg-success/5 border border-success/20 rounded-lg'>
                    <p className='text-success text-xs'>
                      You can increase spending by this amount safely
                    </p>
                  </div>
                </div>
              </div>

              {/* Interpretations */}
              <div className='bg-bg-card border border-border rounded-xl p-5'>
                <p className='text-text-primary font-medium text-sm mb-4'>
                  Simulation Insights
                </p>
                <div className='space-y-3'>
                  {data.interpretations.map((item, i) => {
                    const cfg =
                      severityConfig[item.severity] || severityConfig.low
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}
                      >
                        <span className={`${cfg.text} shrink-0`}>
                          {cfg.icon}
                        </span>
                        <p className={`text-sm ${cfg.text}`}>{item.message}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Under the hood */}
              <div className='bg-bg-card border border-border rounded-xl p-5'>
                <p className='text-xs font-medium text-text-secondary uppercase tracking-widest mb-4'>
                  Under the hood
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {[
                    {
                      step: '01',
                      title: 'Normal distribution sampling',
                      desc: `Each simulation samples income and expense from N(μ, σ) where μ is Prophet's forecast and σ is derived from the confidence interval width. This captures your historical volatility.`
                    },
                    {
                      step: '02',
                      title: 'Cumulative savings tracking',
                      desc: 'Each month: savings = savings + income − expense. This compounds over the horizon, so early months have outsized impact on final outcomes.'
                    },
                    {
                      step: '03',
                      title: 'VaR and CVaR',
                      desc: `95% VaR = current savings − p5. CVaR = average of the worst 5% of final savings outcomes. CVaR is more conservative than VaR and better captures tail risk.`
                    },
                    {
                      step: '04',
                      title: 'Safe spend binary search',
                      desc: 'Runs 10 iterations of binary search to find the maximum monthly spending increase that keeps deficit probability below 20% — rerunning the simulation at each step.'
                    }
                  ].map(item => (
                    <div key={item.step} className='flex gap-3'>
                      <span className='text-accent font-mono text-sm mt-0.5 shrink-0'>
                        {item.step}
                      </span>
                      <div>
                        <p className='text-text-primary text-sm font-medium'>
                          {item.title}
                        </p>
                        <p className='text-text-secondary text-xs mt-1 leading-relaxed'>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}