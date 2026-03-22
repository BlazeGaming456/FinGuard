'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
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

export default function ForecastPage () {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [horizon, setHorizon] = useState(6)
  const [activeView, setActiveView] = useState('expense')

  const fetchForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forecast?horizon=${horizon}`)
      if (!res.ok) throw new Error('Forecast service unavailable')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [horizon])

  // Build chart data — merge historical + forecast into one series
  const buildChartData = fc => {
    if (!fc || fc.status !== 'ok') return []
    const historical = fc.historical.map(r => ({
      month: new Date(r.ds).toLocaleString('default', {
        month: 'short',
        year: '2-digit'
      }),
      actual: Math.round(r.y_actual),
      fitted: Math.round(r.yhat),
      isForeccast: false
    }))
    const forecast = fc.forecast.map(r => ({
      month: new Date(r.ds).toLocaleString('default', {
        month: 'short',
        year: '2-digit'
      }),
      predicted: Math.round(r.yhat),
      lower: Math.round(r.yhat_lower),
      upper: Math.round(r.yhat_upper),
      isForecast: true
    }))
    return [...historical, ...forecast]
  }

  const expenseData = data ? buildChartData(data.expense) : []
  const incomeData = data ? buildChartData(data.income) : []
  const chartData = activeView === 'expense' ? expenseData : incomeData

  // Split point between historical and forecast
  const splitIdx = data
    ? activeView === 'expense'
      ? data.expense.historical?.length
      : data.income.historical?.length
    : 0

  const fc = data
    ? activeView === 'expense'
      ? data.expense
      : data.income
    : null

  return (
    <div className='min-h-screen bg-bg-primary text-text-primary p-6 space-y-6'>
      {/* ── Header ── */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>Prophet Forecast</h1>
          <p className='text-text-secondary text-sm mt-0.5'>
            Time-series forecasting using Facebook Prophet
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <label className='text-text-secondary text-xs'>Horizon</label>
          <select
            value={horizon}
            onChange={e => setHorizon(Number(e.target.value))}
            className='bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent'
          >
            {[3, 6, 9, 12].map(h => (
              <option key={h} value={h}>
                {h} months
              </option>
            ))}
          </select>
          <button
            onClick={fetchForecast}
            disabled={loading}
            className='px-4 py-2 bg-accent hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors'
          >
            {loading ? 'Running...' : 'Run Forecast'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className='bg-danger/10 border border-danger/30 rounded-xl p-4'>
          <p className='text-danger text-sm'>⚠ {error}</p>
          <p className='text-text-secondary text-xs mt-1'>
            Make sure your ML server is running at localhost:8000
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className='flex items-center justify-center h-64'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin' />
            <p className='text-text-secondary text-sm'>
              Training Prophet model...
            </p>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Stat cards ── */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {[
              {
                label: 'Forecast Horizon',
                value: `${data.horizon_months} months`,
                sub: 'forward prediction window',
                color: 'text-accent',
                dot: 'bg-accent'
              },
              {
                label: 'Avg Predicted Expense',
                value: `₹${Math.round(
                  data.expense.forecast?.reduce((a, r) => a + r.yhat, 0) /
                    (data.expense.forecast?.length || 1)
                ).toLocaleString()}`,
                sub: 'per month',
                color: 'text-danger',
                dot: 'bg-danger'
              },
              {
                label: 'Avg Predicted Income',
                value: `₹${Math.round(
                  data.income.forecast?.reduce((a, r) => a + r.yhat, 0) /
                    (data.income.forecast?.length || 1)
                ).toLocaleString()}`,
                sub: 'per month',
                color: 'text-success',
                dot: 'bg-success'
              },
              {
                label: 'Outliers Capped',
                value:
                  (data.expense.outliers_capped ?? 0) +
                  (data.income.outliers_capped ?? 0),
                sub: 'extreme months smoothed',
                color: 'text-warning',
                dot: 'bg-warning'
              }
            ].map((card, i) => (
              <div
                key={i}
                className='bg-bg-card border border-border rounded-xl p-4'
              >
                <div className='flex items-center gap-2 mb-3'>
                  <div className={`w-2 h-2 rounded-full ${card.dot}`} />
                  <p className='text-text-secondary text-xs'>{card.label}</p>
                </div>
                <p className={`text-xl font-semibold ${card.color}`}>
                  {card.value}
                </p>
                <p className='text-text-secondary text-xs mt-1'>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Main chart ── */}
          <div className='bg-bg-card border border-border rounded-xl p-5'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
              <div>
                <p className='text-text-primary font-medium text-sm'>
                  {activeView === 'expense' ? 'Expense' : 'Income'} Forecast
                </p>
                <p className='text-text-secondary text-xs mt-0.5'>
                  Actual values + Prophet prediction with confidence interval
                </p>
              </div>
              <div className='flex gap-1'>
                {['expense', 'income'].map(v => (
                  <button
                    key={v}
                    onClick={() => setActiveView(v)}
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors capitalize
                      ${
                        activeView === v
                          ? 'bg-accent text-white'
                          : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                      }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width='100%' height={300}>
              <ComposedChart data={chartData}>
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
                  formatter={(value, name) => [
                    `₹${value?.toLocaleString()}`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ color: '#8b92a5', fontSize: '12px' }} />

                {/* Confidence band */}
                <Area
                  dataKey='upper'
                  fill={activeView === 'expense' ? '#6366f120' : '#22c55e20'}
                  stroke='none'
                  name='Upper bound'
                />
                <Area
                  dataKey='lower'
                  fill='#0f1117'
                  stroke='none'
                  name='Lower bound'
                />

                {/* Actual line */}
                <Line
                  dataKey='actual'
                  stroke={activeView === 'expense' ? '#ef4444' : '#22c55e'}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: activeView === 'expense' ? '#ef4444' : '#22c55e'
                  }}
                  name='Actual'
                  connectNulls={false}
                />

                {/* Fitted / predicted line */}
                <Line
                  dataKey='fitted'
                  stroke='#6366f1'
                  strokeWidth={1.5}
                  strokeDasharray='4 4'
                  dot={false}
                  name='Fitted'
                  connectNulls={false}
                />
                <Line
                  dataKey='predicted'
                  stroke='#6366f1'
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6366f1' }}
                  name='Forecast'
                  connectNulls={false}
                />

                {/* Vertical line separating historical from forecast */}
                {splitIdx > 0 && (
                  <ReferenceLine
                    x={chartData[splitIdx]?.month}
                    stroke='#2a2d3e'
                    strokeDasharray='6 3'
                    label={{
                      value: 'Forecast →',
                      fill: '#8b92a5',
                      fontSize: 10
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend explanation */}
            <div className='flex flex-wrap gap-4 mt-4 pt-4 border-t border-border'>
              {[
                {
                  color: 'bg-danger',
                  label: 'Actual expenses',
                  show: activeView === 'expense'
                },
                {
                  color: 'bg-success',
                  label: 'Actual income',
                  show: activeView === 'income'
                },
                { color: 'bg-accent', label: 'Prophet forecast' },
                { color: 'bg-accent/20', label: '80% confidence band' }
              ]
                .filter(l => l.show !== false)
                .map((l, i) => (
                  <div key={i} className='flex items-center gap-2'>
                    <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                    <span className='text-text-secondary text-xs'>
                      {l.label}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Forecast table ── */}
          <div className='bg-bg-card border border-border rounded-xl p-5'>
            <p className='text-text-primary font-medium text-sm mb-4'>
              Forecast Values
            </p>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-border'>
                    {[
                      'Month',
                      'Predicted',
                      'Lower bound',
                      'Upper bound',
                      'Width'
                    ].map(h => (
                      <th
                        key={h}
                        className='px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider'
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fc?.forecast?.map((row, i) => {
                    const width = row.yhat_upper - row.yhat_lower
                    return (
                      <tr
                        key={i}
                        className='border-t border-border/50 hover:bg-bg-secondary/50 transition-colors'
                      >
                        <td className='px-4 py-3 text-text-secondary text-xs'>
                          {new Date(row.ds).toLocaleString('default', {
                            month: 'long',
                            year: 'numeric'
                          })}
                        </td>
                        <td className='px-4 py-3 text-text-primary text-xs font-medium'>
                          ₹{Math.round(row.yhat).toLocaleString()}
                        </td>
                        <td className='px-4 py-3 text-success text-xs'>
                          ₹{Math.round(row.yhat_lower).toLocaleString()}
                        </td>
                        <td className='px-4 py-3 text-danger text-xs'>
                          ₹{Math.round(row.yhat_upper).toLocaleString()}
                        </td>
                        <td className='px-4 py-3 text-xs'>
                          <div className='flex items-center gap-2'>
                            <div className='flex-1 bg-bg-secondary rounded-full h-1.5 max-w-24'>
                              <div
                                className='bg-accent h-1.5 rounded-full'
                                style={{
                                  width: `${Math.min(
                                    (width / 100000) * 100,
                                    100
                                  )}%`
                                }}
                              />
                            </div>
                            <span className='text-text-secondary'>
                              ₹{Math.round(width).toLocaleString()}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Insights ── */}
          {data.insights?.length > 0 && (
            <div className='bg-bg-card border border-border rounded-xl p-5'>
              <p className='text-text-primary font-medium text-sm mb-4'>
                Forecast Insights
              </p>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {data.insights.map((insight, i) => {
                  const cfg =
                    severityConfig[insight.severity] || severityConfig.low
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 p-4 rounded-lg border ${cfg.bg}`}
                    >
                      <span className={cfg.text}>{cfg.icon}</span>
                      <p className={`text-sm ${cfg.text}`}>{insight.message}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Under the hood ── */}
          <div className='bg-bg-card border border-border rounded-xl p-5'>
            <p className='text-xs font-medium text-text-secondary uppercase tracking-widest mb-4'>
              Under the hood
            </p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {[
                {
                  step: '01',
                  title: 'Additive decomposition',
                  desc: 'Prophet splits your data into trend + seasonality + noise. With monthly data, weekly seasonality is disabled — it has no meaning at this granularity.'
                },
                {
                  step: '02',
                  title: 'Changepoint detection',
                  desc: `Trend flexibility is controlled by changepoint_prior_scale=0.05 — conservative, so the model responds only to sustained shifts, not monthly noise. ${
                    data.expense.yearly_seasonality_used
                      ? 'Yearly seasonality enabled (24+ months of data).'
                      : 'Yearly seasonality disabled — needs 24+ months.'
                  }`
                },
                {
                  step: '03',
                  title: 'Confidence intervals',
                  desc: 'Prophet runs internal Monte Carlo sampling to generate the 80% prediction band. Wider bands mean higher uncertainty — common when spending is irregular.'
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
  )
}