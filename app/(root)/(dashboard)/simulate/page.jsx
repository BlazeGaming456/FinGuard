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
import PageHeader from '@/components/PageHeader'

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
  const [activeTool, setActiveTool] = useState('survival')
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
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || err?.detail || 'Simulation failed')
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
      month: r.month === 0 ? 'Now' : `Month ${r.month}`,
      probability: Math.round(r.probability * 100)
    })) ?? []

  const m = data?.normal
  const neverDepletePct = m ? (1 - m.risk_of_deficit) * 100 : null
  const conditionalDepletionMonth = m?.conditional_median_depletion_month
    ? Math.round(m.conditional_median_depletion_month)
    : null

  const emergencyFundPercent = data?.emergency_fund
    ? Math.round(
        ((data.emergency_fund.target - (data.emergency_fund.gap || 0)) /
          data.emergency_fund.target) *
          100
      )
    : null

  const computeGrade = () => {
    const risk = m?.risk_of_deficit ?? 1
    const ef = emergencyFundPercent ?? 0
    if (ef >= 100 && risk < 0.05) return 'A'
    if (ef >= 75 && risk < 0.1) return 'B'
    if (ef >= 50) return 'C'
    if (ef >= 25) return 'D'
    return 'F'
  }

  const financialGrade = computeGrade()

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Simulation'
        subtitle='Phase 5: Monte Carlo simulations for financial survival, affordability, and what-if scenarios'
        badge='Phase 5'
      />

      {/* ── Input panel + results side by side on large screens ── */}
      <div className='stagger-item grid grid-cols-1 lg:grid-cols-3 gap-6'>
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
                  Tool-specific controls
                </p>
                {activeTool === 'scenario' ? (
                  <div className='space-y-4'>
                    <p className='text-text-secondary text-xs'>Only scenario inputs affect the Scenario Planner results.</p>
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

                    <div>
                      <label className='text-text-secondary text-xs block mb-1.5'>
                        Reduced Income: {Math.round(form.reduced_income_multiplier * 100)}% of normal
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
                ) : activeTool === 'afford' ? (
                  <div className='space-y-4'>
                    <p className='text-text-secondary text-xs'>Only purchase targets and timing affect affordability.</p>
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
                ) : activeTool === 'survival' ? (
                  <div className='space-y-3'>
                    <p className='text-text-secondary text-xs'>Financial Survival only uses current savings, horizon, and simulation count.</p>
                    <p className='text-text-secondary text-xs'>Scenario and purchase inputs are ignored in this tab.</p>
                  </div>
                ) : activeTool === 'advanced' ? (
                  <div className='space-y-3'>
                    <p className='text-text-secondary text-xs'>Advanced Metrics reflects your current inputs — if scenario controls are active, metrics will show scenario results.</p>
                    <p className='text-text-secondary text-xs font-medium'>
                      {form.job_loss_months > 0 || form.high_spending_multiplier > 1.3 || form.reduced_income_multiplier < 1 
                        ? '⚠ Scenario mode active' 
                        : '✓ Baseline mode'}
                    </p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <p className='text-text-secondary text-xs'>Advanced Metrics uses the same core settings as Financial Survival.</p>
                    <p className='text-text-secondary text-xs'>Use Scenario Planner or Can I Afford This? for scenario and purchase controls.</p>
                  </div>
                )}
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
          {/* Tool tabs */}
          <div className='flex items-center gap-2'>
            {[
              { key: 'survival', label: 'Financial Survival' },
              { key: 'afford', label: 'Can I Afford This?' },
              { key: 'scenario', label: 'Scenario Planner' },
              { key: 'advanced', label: 'Advanced Metrics' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTool(t.key)
                  setData(null)
                }}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeTool === t.key
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {error && (
            <div className='bg-danger/10 border border-danger/30 rounded-xl p-4'>
              <p className='text-danger text-sm'>⚠ {error}</p>
              <p className='text-text-secondary text-xs mt-1'>
                {error.toLowerCase().includes('insufficient')
                  ? 'Upload at least 6 months of transaction history and try again.'
                  : 'Make sure your ML server is running and you have 6+ months of data.'}
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
              {/* Financial Survival */}
              {activeTool === 'survival' && (
                <>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-bg-card border border-border rounded-xl p-4'>
                      <p className='text-text-secondary text-xs'>Chance of running out</p>
                      <p className='text-xl font-semibold text-danger'>
                        {(m.risk_of_deficit * 100).toFixed(1)}%
                      </p>
                      <p className='text-text-secondary text-xs mt-1'>
                        {neverDepletePct?.toFixed(1)}% of simulations never exhaust savings
                      </p>
                    </div>

                    <div className='bg-bg-card border border-border rounded-xl p-4'>
                      <p className='text-text-secondary text-xs'>Typical depletion month (conditional)</p>
                      <p className='text-xl font-semibold'>
                        {conditionalDepletionMonth
                          ? `Month ${conditionalDepletionMonth}`
                          : '—'}
                      </p>
                      <p className='text-text-secondary text-xs mt-1'>
                        {conditionalDepletionMonth
                          ? `Median month only among the ${(m.risk_of_deficit * 100).toFixed(1)}% of simulations that run out — not your most likely outcome`
                          : 'No simulations exhausted savings in this run'}
                      </p>
                    </div>

                    <div className='bg-bg-card border border-border rounded-xl p-4'>
                      <p className='text-text-secondary text-xs'>Emergency fund status</p>
                      <p className='text-xl font-semibold'>
                        {emergencyFundPercent ?? '-'}%
                      </p>
                      <p className='text-text-secondary text-xs mt-1'>Percent of 6-month target covered</p>
                    </div>

                    <div className='bg-bg-card border border-border rounded-xl p-4'>
                      <p className='text-text-secondary text-xs'>Recovery probability</p>
                      <p className='text-xl font-semibold text-success'>
                        {(m.recovery_probability * 100).toFixed(0)}%
                      </p>
                      <p className='text-text-secondary text-xs mt-1'>Of negative scenarios that recover within horizon</p>
                    </div>
                  </div>

                  <div className='bg-bg-card border border-border rounded-xl p-5 mt-3'>
                    <p className='text-text-primary font-medium text-sm'>Financial Health Grade</p>
                    <p className='text-2xl font-bold mt-2'>{financialGrade}</p>
                    <p className='text-text-secondary text-xs mt-1'>A quick grade based on emergency fund coverage and deficit risk</p>
                  </div>
                </>
              )}

              {/* Affordability / Purchase Planning */}
              {activeTool === 'afford' && (
                <>
                  {affordData.length > 0 && form.target_purchase > 0 ? (
                    <div className='space-y-4'>
                      <div className='bg-bg-card border border-border rounded-xl p-5'>
                        <p className='text-text-primary font-medium text-sm mb-1'>
                          Affordability Timeline — ₹{Number(form.target_purchase).toLocaleString()}
                        </p>
                        <p className='text-text-secondary text-xs mb-4'>
                          Probability that savings stay at or above ₹{Number(form.target_purchase).toLocaleString()} (not after deducting the purchase)
                        </p>
                        <ResponsiveContainer width='100%' height={160}>
                          <BarChart data={affordData}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' />
                            <XAxis dataKey='month' tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                            <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Probability']} />
                            <Bar dataKey='probability' fill='#6366f1' radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className='bg-bg-card border border-border rounded-xl p-5'>
                        <p className='text-text-primary font-medium text-sm'>Quick answers</p>
                        <div className='mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                          <div className='p-3 bg-bg-secondary rounded-md'>
                            <p className='text-text-secondary text-xs'>Can afford today</p>
                            <p className='text-xl font-semibold'>
                              {data.can_afford_now || Number(form.current_savings) >= Number(form.target_purchase)
                                ? '100%'
                                : '0%'}
                            </p>
                            <p className='text-text-secondary text-xs mt-1'>
                              Savings ≥ target right now
                            </p>
                          </div>
                          <div className='p-3 bg-bg-secondary rounded-md'>
                            <p className='text-text-secondary text-xs'>Chance by target month</p>
                            <p className='text-xl font-semibold'>
                              {(() => {
                                const e = affordData.find(r => r.month === `Month ${form.target_months}`)
                                return e ? `${e.probability}%` : 'N/A'
                              })()}
                            </p>
                            <p className='text-text-secondary text-xs mt-1'>
                              Savings still ≥ target at month {form.target_months}
                            </p>
                          </div>
                          <div className='p-3 bg-bg-secondary rounded-md'>
                            <p className='text-text-secondary text-xs'>Chance by 12 months</p>
                            <p className='text-xl font-semibold'>
                              {(() => {
                                const e = affordData.find(r => r.month === 'Month 12')
                                return e ? `${e.probability}%` : '—'
                              })()}
                            </p>
                          </div>
                        </div>

                        {Number(form.current_savings) >= Number(form.target_purchase) && (
                          <div className='mt-3 p-3 bg-success/5 border border-success/20 rounded-lg'>
                            <p className='text-success text-xs'>
                              You already have ₹{Number(form.current_savings).toLocaleString()} — this purchase is affordable today. Future-month probabilities show whether savings are likely to stay above ₹{Number(form.target_purchase).toLocaleString()}.
                            </p>
                          </div>
                        )}

                        <div className='mt-3 grid grid-cols-1 sm:grid-cols-1 gap-3'>
                          <div className='p-3 bg-bg-secondary rounded-md'>
                            <p className='text-text-secondary text-xs'>Recommended monthly savings</p>
                            <p className='text-xl font-semibold'>
                              {(() => {
                                const idx = Math.max(0, Number(form.target_months) - 1)
                                const medianAtTarget = fanChartData[idx]?.median ?? Math.round(m.percentiles.p50)
                                const shortfall = Math.max(0, Number(form.target_purchase) - medianAtTarget)
                                const rec = shortfall > 0 ? Math.ceil(shortfall / Number(form.target_months)) : 0
                                return `₹${rec.toLocaleString()}`
                              })()}
                            </p>
                            <p className='text-text-secondary text-xs mt-1'>Only needed if you cannot afford the target today</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='bg-bg-card border border-border rounded-xl p-6'>
                      <p className='text-text-secondary text-sm'>Enter a target purchase amount to see affordability projections.</p>
                    </div>
                  )}
                </>
              )}

              {/* Scenario Planner */}
              {activeTool === 'scenario' && (
                <>
                  <div className='bg-bg-card border border-border rounded-xl p-5'>
                    <p className='text-text-primary font-medium text-sm mb-1'>Scenario Comparison</p>
                    <p className='text-text-secondary text-xs mb-5'>Median savings outcome by scenario</p>
                    <ResponsiveContainer width='100%' height={180}>
                      <BarChart data={scenarioData} layout='vertical'>
                        <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' horizontal={false} />
                        <XAxis type='number' tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <YAxis type='category' dataKey='scenario' tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v?.toLocaleString()}`]} />
                        <Bar dataKey='value' radius={[0, 4, 4, 0]} fill='#6366f1' />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className='bg-bg-card border border-border rounded-xl p-5 mt-3'>
                    <p className='text-text-primary font-medium text-sm mb-3'>What-if quick checks</p>
                    <div className='space-y-2'>
                      {data.interpretations.map((item, i) => {
                        const cfg = severityConfig[item.severity] || severityConfig.low
                        return (
                          <div key={i} className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                            <span className={`${cfg.text} shrink-0`}>{cfg.icon}</span>
                            <p className={`text-sm ${cfg.text}`}>{item.message}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Advanced Metrics */}
              {activeTool === 'advanced' && (
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
                        sub: 'worst-case loss vs today (95% confidence, capped at current savings)',
                        color: 'text-warning',
                        dot: 'bg-warning'
                      },
                      {
                        label: 'CVaR (Worst 5%)',
                        value: `₹${Math.round(m.cvar_95).toLocaleString()}`,
                        sub: 'avg loss in worst 5% of outcomes',
                        color: 'text-danger',
                        dot: 'bg-danger'
                      },
                      {
                        label: 'Max Drawdown',
                        value: `₹${Math.round(m.worst_drawdown).toLocaleString()}`,
                        sub: 'largest peak-to-trough drop across all simulations',
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
                      <div key={i} className='bg-bg-card border border-border rounded-xl p-4'>
                        <div className='flex items-center gap-2 mb-2'>
                          <div className={`w-2 h-2 rounded-full ${card.dot}`} />
                          <p className='text-text-secondary text-xs'>{card.label}</p>
                        </div>
                        <p className={`text-xl font-semibold ${card.color}`}>{card.value}</p>
                        <p className='text-text-secondary text-xs mt-1'>{card.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Percentile bands chart */}
                  <div className='bg-bg-card border border-border rounded-xl p-5 mt-3'>
                    <p className='text-text-primary font-medium text-sm mb-1'>Savings Distribution Over Time</p>
                    <p className='text-text-secondary text-xs mb-5'>Percentile bands from {data.n_simulations.toLocaleString()} simulations</p>
                    <ResponsiveContainer width='100%' height={220}>
                      <LineChart data={fanChartData}>
                        <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' />
                        <XAxis dataKey='month' tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v?.toLocaleString()}`]} />
                        <Line dataKey='p95' stroke='#22c55e' strokeWidth={1.5} strokeDasharray='4 2' dot={false} name='p95 (best)' />
                        <Line dataKey='p75' stroke='#6366f1' strokeWidth={1} strokeDasharray='4 2' dot={false} name='p75' />
                        <Line dataKey='median' stroke='#ffffff' strokeWidth={2} dot={false} name='Median' />
                        <Line dataKey='p25' stroke='#f59e0b' strokeWidth={1} strokeDasharray='4 2' dot={false} name='p25' />
                        <Line dataKey='p5' stroke='#ef4444' strokeWidth={1.5} strokeDasharray='4 2' dot={false} name='p5 (worst)' />
                        <Legend wrapperStyle={{ color: '#8b92a5', fontSize: '11px' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Emergency fund + safe spend */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3'>
                    <div className='bg-bg-card border border-border rounded-xl p-5'>
                      <p className='text-text-secondary text-xs uppercase tracking-widest mb-3'>Emergency Fund</p>
                      <p className='text-text-primary text-2xl font-semibold'>₹{Math.round(data.emergency_fund.target).toLocaleString()}</p>
                      <p className='text-text-secondary text-xs mt-1'>6 months of avg expenses</p>
                      {data.emergency_fund.gap > 0 && (
                        <>
                          <div className='mt-3 bg-bg-secondary rounded-full h-2'>
                            <div className='bg-accent h-2 rounded-full' style={{ width: `${Math.min(((data.emergency_fund.target - data.emergency_fund.gap) / data.emergency_fund.target) * 100, 100)}%` }} />
                          </div>
                          <p className='text-text-secondary text-xs mt-2'>Gap: ₹{Math.round(data.emergency_fund.gap).toLocaleString()}{data.emergency_fund.months_to_reach && ` · ${data.emergency_fund.months_to_reach} months to reach`}</p>
                        </>
                      )}
                      {data.emergency_fund.gap === 0 && <p className='text-success text-xs mt-2'>✓ Emergency fund already covered</p>}
                    </div>

                    <div className='bg-bg-card border border-border rounded-xl p-5'>
                      <p className='text-text-secondary text-xs uppercase tracking-widest mb-3'>
                        Additional Monthly Spending Before Deficit Risk Exceeds 20%
                      </p>
                      <p className='text-success text-2xl font-semibold'>₹{Math.round(data.safe_extra_spend).toLocaleString()}</p>
                      <p className='text-text-secondary text-xs mt-1'>Maximum extra monthly spend while keeping deficit risk below 20%</p>
                      <div className='mt-3 p-2 bg-success/5 border border-success/20 rounded-lg'><p className='text-success text-xs'>Based on binary search over {data.n_simulations.toLocaleString()} simulations</p></div>
                    </div>
                  </div>

                  {/* Interpretations & Under the hood */}
                  <div className='bg-bg-card border border-border rounded-xl p-5 mt-3'>
                    <p className='text-text-primary font-medium text-sm mb-4'>Simulation Insights</p>
                    <div className='space-y-3'>
                      {data.interpretations.map((item, i) => {
                        const cfg = severityConfig[item.severity] || severityConfig.low
                        return (
                          <div key={i} className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                            <span className={`${cfg.text} shrink-0`}>{cfg.icon}</span>
                            <p className={`text-sm ${cfg.text}`}>{item.message}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className='mt-6'>
                      <p className='text-xs font-medium text-text-secondary uppercase tracking-widest mb-4'>Under the hood</p>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        {[
                          {
                            step: '01',
                            title: 'Truncated normal sampling',
                            desc: `Each simulation samples income and expense from N(μ, σ) clamped to [0, μ + 3σ]. This prevents unrealistic negative income or extreme expense spikes.`
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
                            desc: 'Runs 10 iterations of binary search to find the maximum additional monthly spending that keeps deficit probability below 20% — rerunning the simulation at each step.'
                          }
                        ].map(item => (
                          <div key={item.step} className='flex gap-3'>
                            <span className='text-accent font-mono text-sm mt-0.5 shrink-0'>{item.step}</span>
                            <div>
                              <p className='text-text-primary text-sm font-medium'>{item.title}</p>
                              <p className='text-text-secondary text-xs mt-1 leading-relaxed'>{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
