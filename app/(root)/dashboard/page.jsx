'use client'

import React, { use } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Pie, PieChart, Cell } from 'recharts'
import { RechartsDevtools } from '@recharts/devtools'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipIndex,
  Legend
} from 'recharts'
import { LineChart, Line } from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const page = () => {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})
  const [score, setScore] = useState(0)
  const [analytics, setAnalytics] = useState({})

  //For filtering the transactions
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')

  //For calculating Data Qualty
  const [dataQuality, setDataQuality] = useState({})

  //For recategorization
  const [categoryOverride, setCategoryOverride] = useState({})
  const [saving, setSaving] = useState(false)

  //For drilling down the data on the graphs
  const [drillDown, setDrillDown] = useState(null)
  const drillDownTransactions = useMemo(() => {
    if (!drillDown) return []
    return transactions?.filter(t => {
      const resolvedCategory = categoryOverride[t.id] || t.category
      return resolvedCategory === drillDown
    })
  }, [drillDown, transactions, categoryOverride])

  const getData = async () => {
    const res = await fetch('/api/fetch/transactions')
    const data = await res.json()

    console.log(data)
    setTransactions(data.transactions)
  }

  const statistics = async data => {
    if (data.length > 0) {
      const totalIncome = data
        .filter(t => t.type === 'CREDIT')
        .reduce((acc, t) => acc + t.amount, 0)
      const totalExpense = data
        .filter(t => t.type === 'DEBIT')
        .reduce((acc, t) => acc + t.amount, 0)
      const balance = totalIncome - totalExpense
      const rawCategoryWise = data.reduce((acc, t) => {
        if (t.category === 'Income') {
          return acc
        }
        if (!acc[t.category]) {
          acc[t.category] = 0
        }
        acc[t.category] += t.amount
        return acc
      }, {})
      const categoryWise = Object.entries(rawCategoryWise).map(
        ([key, value]) => {
          return { name: key, value: value }
        }
      )
      const monthlyExpense = data.reduce((acc, t) => {
        if (t.type === 'CREDIT') return acc
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric'
        })
        if (!acc[month]) {
          acc[month] = 0
        }
        acc[month] += t.amount

        return acc
      }, {})
      const monthlyIncome = data.reduce((acc, t) => {
        if (t.type === 'DEBIT') return acc
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric'
        })
        if (!acc[month]) {
          acc[month] = 0
        }
        acc[month] += t.amount

        return acc
      }, {})
      const monthlyExpenseData = Object.entries(monthlyExpense).map(
        ([key, value]) => {
          return { month: key, expense: value }
        }
      )
      const monthlyIncomeData = Object.entries(monthlyIncome).map(
        ([key, value]) => {
          return { month: key, income: value }
        }
      )
      const monthlyData = data.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric'
        })

        if (!acc[month]) {
          acc[month] = {
            month,
            income: 0,
            expense: 0
          }
        }
        if (t.type === 'CREDIT') {
          acc[month].income += t.amount
        } else {
          acc[month].expense += t.amount
        }

        return acc
      }, {})
      const monthlyDataObject = Object.entries(monthlyData).map(
        ([key, value]) => {
          return {
            month: key,
            income: value.income,
            expense: value.expense
          }
        }
      )
      const transactionCount = data.length
      const maxExpenseCategory = categoryWise.reduce(
        (max, category) => {
          max = max.value > category.value ? max : category
          return max
        },
        { name: '', value: 0 }
      )
      const maxExpense = data.reduce(
        (max, t) => {
          if (t.type === 'CREDIT') return max
          max = max.amount > t.amount ? max : t
          return max
        },
        { amount: 0 }
      )
      const averageDailyExpense = totalExpense / monthlyExpenseData.length

      setStats({
        totalIncome,
        totalExpense,
        balance,
        categoryWise,
        transactionCount,
        monthlyExpenseData,
        monthlyIncomeData,
        maxExpenseCategory,
        maxExpense,
        averageDailyExpense,
        monthlyDataObject
      })

      console.log(stats)
    }
  }

  const advisory = () => {
    if (filteredTransactions.length > 0) {
      const monthlyDataObject = stats.monthlyDataObject
      let curScore = 0
      //Persistent Deficit
      let deficitMonths = 0
      for (let i = monthlyDataObject.length - 1; i >= 0; i--) {
        if (monthlyDataObject[i].expense > monthlyDataObject[i].income) {
          deficitMonths++
        } else {
          break
        }
      }
      if (deficitMonths >= 3) {
        curScore += 3
      } else if (deficitMonths > 0) {
        curScore += 1
      }
      //Very Low Savings Rate
      let savingsRates = 0
      let n = 0
      for (let i = monthlyDataObject.length - 1; i >= 0; i--) {
        let val =
          (monthlyDataObject[i].income - monthlyDataObject[i].expense) /
          monthlyDataObject[i].income
        n++
        savingsRates += val
      }
      savingsRates = (savingsRates * 100) / n
      if (savingsRates < 5) {
        curScore += 3
      } else if (savingsRates < 10) {
        curScore += 1
      }
      //EMI/Debt Burden High
      const emiRate = 0 //Finish after proper formatting
      //Expense-to-Income Ratio
      const expenseToIncomeRatio =
        (stats.totalExpense / stats.totalIncome) * 100
      if (expenseToIncomeRatio > 90) {
        curScore += 3
      } else if (expenseToIncomeRatio > 75) {
        curScore += 1
      }
      //Large Expense Spikes
      let spikes = 0
      for (let i = 1; i < monthlyDataObject.length; i++) {
        if (
          monthlyDataObject[i].expense >
          1.5 * monthlyDataObject[i - 1].expense
        ) {
          spikes++
        }
      }
      if (spikes >= 2) {
        curScore += 3
      } else if (spikes === 1) {
        curScore += 1
      }
      //3 Month Expense Trend
      let isIncreasing = false
      if (monthlyDataObject.length >= 3) {
        const last3Months = monthlyDataObject.slice(-3)
        isIncreasing = last3Months.every((val, i, arr) => {
          if (i === 0) return true
          return val.expense > arr[i - 1].expense
        })
      }
      if (isIncreasing) {
        curScore += 3
      }
      //Income Drop Trend
      let incomeDropPercent = 0
      if (monthlyDataObject.length >= 3) {
        const last3Months = monthlyDataObject.slice(-3)
        let avgPercentDrop = 0
        for (let i = 0; i < last3Months.length - 2; i++) {
          let percentDrop =
            (last3Months[i].income - last3Months[i + 1].income) /
            last3Months[i].income
          avgPercentDrop += percentDrop
        }
        incomeDropPercent = (avgPercentDrop * 100) / (last3Months.length - 2)
      }
      if (incomeDropPercent > 20) {
        curScore += 3
      } else if (incomeDropPercent > 10) {
        curScore += 1
      }
      //Discretionary Spending Concentration
      //If Food + Entertainment + Shopping > 60% of total expenses

      //Single Transaction Shock
      for (let t of filteredTransactions) {
        if (t.type === 'DEBIT' && t.amount > 0.5 * stats.totalIncome) {
          curScore += 3
          break
        }
      }

      //Data Quality Parameters
      const totalTransactions = transactions.length
      const sortedDates = transactions
        .map(t => new Date(t.date))
        .sort((a, b) => a - b)
      const firstDate = sortedDates[0].toLocaleDateString()
      const lastDate = sortedDates[sortedDates.length - 1].toLocaleDateString()

      const missingMonths = []
      const allMonths = Object.keys(stats.monthlyDataObject)
      for (let i = 1; i < allMonths.length; i++) {
        const prev = new Date(allMonths[i - 1])
        const curr = new Date(allMonths[i])
        const monthDiff =
          (curr.getFullYear() - prev.getFullYear()) * 12 +
          (curr.getMonth() - prev.getMonth())
        if (monthDiff > 1) {
          missingMonths.push(
            `${prev.toLocaleString('default', {
              month: 'short',
              year: 'numeric'
            })} → ${curr.toLocaleString('default', {
              month: 'short',
              year: 'numeric'
            })}`
          )
        }
      }

      const avgTransactions =
        transactions
          .filter(t => t.type === 'DEBIT')
          .reduce((acc, t) => acc + t.amount, 0) /
        transactions.filter(t => t.type === 'DEBIT').length
      const anomalies = transactions.filter(
        t => t.type === 'DEBIT' && t.amount > 2 * avgTransactions
      ).length

      const uniqueCategories = [
        ...new Set(transactions.map(t => t.category))
      ].filter(c => c != 'Income' || c != 'Food' || c != 'Entertainment')

      //Anomaly Detection

      setDataQuality({
        totalTransactions,
        dateRange: `${firstDate} → ${lastDate}`,
        missingMonths,
        anomalies,
        uniqueCategories
      })

      setScore(curScore)
      setAnalytics({
        deficitMonths,
        savingsRates,
        emiRate,
        spikes,
        expenseToIncomeRatio,
        spikes,
        isIncreasing,
        incomeDropPercent
      })
    }
  }

  //3. For filtering the transactions based on their date
  const availableMonths = stats?.monthlyDataObject?.map(d => d.month) ?? []

  //4. For recategorization of the transactions
  const saveRecategorization = async () => {
    setSaving(true)
    try {
      const update = Object.entries(categoryOverride).map(([id, category]) => ({
        id,
        category
      }))
      await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates: update })
      })
      setCategoryOverride({})
      await getData()
    } catch (error) {
      console.error('Failed to save: ', error)
    } finally {
      setSaving(false)
    }
  }

  //5. Saving as PDF
  const exportPDF = () => {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210 // A4 width in mm
  const margin = 14
  const col = margin
  let y = 0

  // ── Header bar ──────────────────────────────────────────
  pdf.setFillColor(99, 102, 241) // indigo
  pdf.rect(0, 0, W, 22, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FinGuard Financial Report', col, 14)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date().toLocaleDateString(), W - margin, 14, { align: 'right' })
  y = 32

  // ── Risk badge ──────────────────────────────────────────
  const riskLabel = score < 5 ? 'LOW RISK' : score < 10 ? 'MODERATE RISK' : 'HIGH RISK'
  const riskColor = score < 5 ? [34,197,94] : score < 10 ? [245,158,11] : [239,68,68]
  pdf.setFillColor(...riskColor)
  pdf.roundedRect(col, y - 5, 38, 9, 2, 2, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text(riskLabel, col + 19, y + 1, { align: 'center' })

  pdf.setTextColor(100, 100, 100)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`FinGuard Score: ${score}`, col + 42, y + 1)
  y += 14

  // ── Summary cards (4 across) ────────────────────────────
  const cards = [
    { label: 'Total Income',   value: `₹${stats.totalIncome?.toLocaleString()}`,   color: [34,197,94]  },
    { label: 'Total Expense',  value: `₹${stats.totalExpense?.toLocaleString()}`,  color: [239,68,68]  },
    { label: 'Balance',        value: `₹${stats.balance?.toLocaleString()}`,        color: [99,102,241] },
    { label: 'Transactions',   value: stats.transactionCount,                       color: [14,165,233] },
  ]
  const cardW = (W - margin * 2 - 9) / 4
  cards.forEach((card, i) => {
    const x = col + i * (cardW + 3)
    pdf.setFillColor(245, 245, 255)
    pdf.roundedRect(x, y, cardW, 18, 2, 2, 'F')
    pdf.setDrawColor(...card.color)
    pdf.setLineWidth(0.8)
    pdf.line(x, y, x, y + 18) // left accent line
    pdf.setTextColor(...card.color)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(String(card.value), x + cardW / 2, y + 8, { align: 'center' })
    pdf.setTextColor(120, 120, 120)
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.text(card.label, x + cardW / 2, y + 14, { align: 'center' })
  })
  y += 26

  // ── Section helper ──────────────────────────────────────
  const sectionTitle = (title) => {
    pdf.setFillColor(240, 240, 255)
    pdf.rect(col, y, W - margin * 2, 7, 'F')
    pdf.setTextColor(99, 102, 241)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, col + 2, y + 5)
    y += 11
  }

  // ── Advisory flags ──────────────────────────────────────
  sectionTitle('Advisory Flags')
  const flags = [
    analytics.deficitMonths > 0 && `Deficit for ${analytics.deficitMonths} consecutive month(s)`,
    analytics.savingsRates < 10  && `Low savings rate: ${analytics.savingsRates?.toFixed(1)}%`,
    analytics.expenseToIncomeRatio > 75 && `High expense-to-income ratio: ${analytics.expenseToIncomeRatio?.toFixed(1)}%`,
    analytics.spikes > 0 && `${analytics.spikes} unusual expense spike(s) detected`,
    analytics.isIncreasing && `Expenses rising consistently over last 3 months`,
    analytics.incomeDropPercent > 10 && `Income dropped by ${analytics.incomeDropPercent?.toFixed(1)}%`,
  ].filter(Boolean)

  if (flags.length === 0) {
    pdf.setTextColor(34, 197, 94)
    pdf.setFontSize(9)
    pdf.text('✓ No major financial concerns detected.', col, y)
    y += 8
  } else {
    flags.forEach(flag => {
      pdf.setFillColor(255, 240, 240)
      pdf.roundedRect(col, y, W - margin * 2, 7, 1, 1, 'F')
      pdf.setTextColor(239, 68, 68)
      pdf.setFontSize(8)
      pdf.text(`⚠  ${flag}`, col + 2, y + 5)
      y += 10
    })
  }
  y += 4

  // ── Category breakdown table ─────────────────────────────
  sectionTitle('Category Breakdown')
  pdf.setFontSize(8)
  const tableColors = [99,102,241]

  // Header row
  pdf.setFillColor(...tableColors)
  pdf.rect(col, y, W - margin * 2, 7, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Category', col + 2, y + 5)
  pdf.text('Amount (₹)', col + 80, y + 5)
  pdf.text('% of Expenses', col + 120, y + 5)
  y += 7

  stats.categoryWise?.forEach((cat, i) => {
    const bg = i % 2 === 0 ? [252,252,255] : [245,245,255]
    pdf.setFillColor(...bg)
    pdf.rect(col, y, W - margin * 2, 6, 'F')
    pdf.setTextColor(50, 50, 50)
    pdf.setFont('helvetica', 'normal')
    pdf.text(cat.name, col + 2, y + 4)
    pdf.text(`₹${cat.value.toLocaleString()}`, col + 80, y + 4)
    pdf.text(`${((cat.value / stats.totalExpense) * 100).toFixed(1)}%`, col + 120, y + 4)

    // Mini bar
    const barW = ((cat.value / stats.totalExpense) * 50)
    pdf.setFillColor(99, 102, 241)
    pdf.rect(col + 148, y + 1.5, barW, 3, 'F')
    y += 6
  })
  y += 8

  // ── Monthly summary table ────────────────────────────────
  if (y > 230) { pdf.addPage(); y = 14 }
  sectionTitle('Monthly Summary')

  pdf.setFillColor(...tableColors)
  pdf.rect(col, y, W - margin * 2, 7, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Month', col + 2, y + 5)
  pdf.text('Income (₹)', col + 55, y + 5)
  pdf.text('Expense (₹)', col + 100, y + 5)
  pdf.text('Savings (₹)', col + 145, y + 5)
  y += 7

  stats.monthlyDataObject?.forEach((m, i) => {
    if (y > 270) { pdf.addPage(); y = 14 }
    const savings = m.income - m.expense
    const bg = i % 2 === 0 ? [252,252,255] : [245,245,255]
    pdf.setFillColor(...bg)
    pdf.rect(col, y, W - margin * 2, 6, 'F')
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(50, 50, 50)
    pdf.text(m.month, col + 2, y + 4)
    pdf.text(`₹${m.income.toLocaleString()}`, col + 55, y + 4)
    pdf.text(`₹${m.expense.toLocaleString()}`, col + 100, y + 4)
    pdf.setTextColor(savings >= 0 ? 34 : 239, savings >= 0 ? 197 : 68, savings >= 0 ? 94 : 68)
    pdf.text(`₹${savings.toLocaleString()}`, col + 145, y + 4)
    y += 6
  })
  y += 8

  // ── Data Quality ─────────────────────────────────────────
  if (y > 240) { pdf.addPage(); y = 14 }
  sectionTitle('Data Quality')
  pdf.setTextColor(80, 80, 80)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  const dqLines = [
    `Total Transactions: ${dataQuality.totalTransactions}`,
    `Date Range: ${dataQuality.dateRange}`,
    `Missing Months: ${dataQuality.missingMonths?.length === 0 ? 'None' : dataQuality.missingMonths?.join(', ')}`,
    `Anomalies Detected: ${dataQuality.anomalies}`,
  ]
  dqLines.forEach(line => {
    pdf.text(line, col, y)
    y += 6
  })

  // ── Footer on every page ─────────────────────────────────
  const totalPages = pdf.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFillColor(240, 240, 255)
    pdf.rect(0, 287, W, 10, 'F')
    pdf.setTextColor(150, 150, 150)
    pdf.setFontSize(7)
    pdf.text('Generated by FinGuard', col, 293)
    pdf.text(`Page ${p} of ${totalPages}`, W - margin, 293, { align: 'right' })
  }

  pdf.save('finguard-report.pdf')
}

  useEffect(() => {
    getData()
  }, [])

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter(t => {
      const month = new Date(t.date).toLocaleString('default', {
        month: 'short',
        year: 'numeric'
      })
      const startIdx = availableMonths.indexOf(startMonth)
      const endIdx = availableMonths.indexOf(endMonth)
      const monthIdx = availableMonths.indexOf(month)

      if (startMonth && monthIdx < startIdx) return false
      if (endMonth && monthIdx > endIdx) return false
      return true
    })
  }, [transactions, startMonth, endMonth])

  useEffect(() => {
    if (filteredTransactions.length === 0) return
    const resolved = filteredTransactions.map(t => ({
      ...t,
      category: categoryOverride[t.id] || t.category
    }))
    statistics(resolved)
  }, [filteredTransactions, categoryOverride])

  useEffect(() => {
    advisory()
  }, [stats])

  const COLORS = [
    '#6366F1',
    '#22C55E',
    '#F59E0B',
    '#EF4444',
    '#0EA5E9',
    '#A855F7',
    '#14B8A6',
    '#F43F5E'
  ]

  const allCategories = [...new Set(transactions.map(t => t.category))]

  console.log(stats)
  console.log(analytics)

  return (
    <div>
      <div>
        <button onClick={exportPDF}>Export as PDF</button>
      </div>
      <div id='dashboard'>
        <div>
          {Object.keys(stats).length === 0 ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p>Here are the analytics from the given data:</p>
              <ul>
                <li>Total Income: {stats.totalIncome}</li>
                <li>Total Expense: {stats.totalExpense}</li>
                <li>Balance: {stats.balance}</li>
                <li>Transaction Count: {stats.transactionCount}</li>
                <li>
                  Max Expense Category: {stats.maxExpenseCategory.name} (
                  {stats.maxExpenseCategory.value})
                </li>
                <li>
                  Max Expense: {stats.maxExpense.amount} (
                  {stats.maxExpense.category})
                </li>
                <li>
                  Average Daily Expense: {stats.averageDailyExpense.toFixed(2)}
                </li>
              </ul>
            </div>
          )}
          <div>
            {stats.categoryWise && (
              <PieChart
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  maxHeight: '80vh',
                  aspectRatio: 2
                }}
                responsive
              >
                <Pie
                  dataKey='value'
                  startAngle={180}
                  endAngle={0}
                  data={stats.categoryWise}
                  cx='50%'
                  cy='100%'
                  outerRadius='120%'
                  isAnimationActive={true}
                  label
                  onClick={data => setDrillDown(data.name)}
                >
                  {stats.categoryWise.map((entry, index) => {
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      ></Cell>
                    )
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
            {drillDown && (
              <div>
                <p>Transactions from {drillDown} category</p>
                <button onClick={() => setDrillDown(null)}>Clear</button>
                {drillDownTransactions?.map((t, i) => (
                  <div key={i}>
                    <p>
                      {t.description} - Rs.{t.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {stats.monthlyExpenseData && stats.monthlyIncomeData && (
              <BarChart
                style={{
                  width: '100%',
                  maxWidth: '700px',
                  maxHeight: '80vh',
                  aspectRatio: 2
                }}
                responsive
                data={stats.monthlyDataObject}
              >
                <Bar
                  dataKey='expense'
                  fill='#6366F1'
                  isAnimationActive={true}
                ></Bar>
                <Bar
                  dataKey='income'
                  fill='#22C55E'
                  isAnimationActive={true}
                ></Bar>
                <Tooltip />
                <XAxis dataKey='month'></XAxis>
                <YAxis name='value' />
              </BarChart>
            )}
            {stats.monthlyExpenseData && (
              <LineChart
                style={{
                  width: '100%',
                  maxWidth: '700px',
                  maxHeight: '80vh',
                  aspectRatio: 2
                }}
                responsive
                data={stats.monthlyExpenseData}
              >
                <Line
                  dataKey='expense'
                  stroke='#6366F1'
                  isAnimationActive={true}
                ></Line>
                <Tooltip />
                <XAxis dataKey='month'></XAxis>
                <YAxis name='Expense' />
              </LineChart>
            )}
          </div>
        </div>
        <div className='bg-gray-500'>
          <p>Here, starts the analytical section</p>
          <div>
            <p>Summary</p>
            <p>FinGuard Score</p>
            <p>{score}</p>
          </div>
          <div>
            <p>Advisory</p>
            {Object.keys(analytics).length === 0 ? (
              <div>Loading...</div>
            ) : (
              <div>
                {analytics.deficitMonths && analytics.deficitMonths > 0 && (
                  <div>
                    <p>Persistent Deficit</p>
                    <p>
                      You have had a deficit for the last{' '}
                      {analytics.deficitMonths} months. Consider reducing your
                      expenses or increasing your income to avoid long term
                      financial issues.
                    </p>
                  </div>
                )}
                {analytics.savingsRates && analytics.savingsRates < 10 && (
                  <div>
                    <p>Very Low Savings Rate</p>
                    <p>
                      Your savings rate is very low. Consider increasing your
                      savings to build a better financial future.
                    </p>
                  </div>
                )}
                {analytics.emiRate &&
                  analytics.emiRates >
                    75 && (
                      <div>
                        <p>High EMI/Debt Burden</p>
                        <p>
                          Your EMI/Debt burden is high. Consider refinancing or
                          increasing your income to manage your debt
                          effectively.
                        </p>
                      </div>
                    )}
                {analytics.spikes && analytics.spikes > 0 && (
                  <div>
                    <p>Expense Spikes</p>
                    <p>
                      You have had significant expense spikes in the last{' '}
                      {analytics.deficitMonths} months. Consider reviewing your
                      spending habits to identify areas for improvement.
                    </p>
                  </div>
                )}
                {analytics.isIncreasing && (
                  <div>
                    <p>Increasing Expenses</p>
                    <p>
                      Your expenses have been increasing over the last{' '}
                      {analytics.deficitMonths} months. Consider reviewing your
                      spending habits to identify areas for improvement.
                    </p>
                  </div>
                )}
                {analytics.incomeDropPercent &&
                  analytics.incomeDropPercent > 10 && (
                    <div>
                      <p>Income Drop</p>
                      <p>
                        Your income has dropped by {analytics.incomeDropPercent}
                        % over the last {analytics.deficitMonths} months.
                        Consider exploring ways to increase your income or
                        reduce your expenses.
                      </p>
                    </div>
                  )}
              </div>
            )}
            <p>Financial Health Score</p>
            {score < 5 ? (
              <p style={{ color: 'green' }}>Good Financial Health</p>
            ) : (
              <p className='text-red'>Poor Financial Health</p>
            )}
          </div>
          <div>
            <p>Financial Summary</p>
            <p>
              You are currently in{' '}
              {score < 5 ? (
                <span style={{ color: 'green' }}>Low</span>
              ) : score < 10 ? (
                <span style={{ color: 'orange' }}>Moderate</span>
              ) : (
                <span style={{ color: 'red' }}>High</span>
              )}{' '}
              risk zone.{' '}
              {analytics.deficitMonths > 0 &&
                `Expenses exceeded income for ${analytics.deficitMonths} consecutive month(s). `}
              {analytics.savingsRates < 20 &&
                `Savings rate is ${analytics.savingsRates?.toFixed(
                  1
                )}%, below the recommended 20%. `}
              {analytics.expenseToIncomeRatio > 75 &&
                `Expense-to-income ratio is high at ${analytics.expenseToIncomeRatio?.toFixed(
                  1
                )}%. `}
              {analytics.spikes > 0 &&
                `${analytics.spikes} unusual expense spike(s) detected. `}
              {analytics.isIncreasing &&
                `Expenses have been rising consistently over the last 3 months. `}
              {analytics.incomeDropPercent > 10 &&
                `Income has dropped by ${analytics.incomeDropPercent?.toFixed(
                  1
                )}% recently. `}
              {score < 5 &&
                analytics.deficitMonths === 0 &&
                analytics.savingsRates >= 20 &&
                `Overall finances look healthy — keep it up.`}
            </p>
          </div>
          <div>
            <p>Transactions List</p>
            <div>
              <label>
                From:
                <select
                  value={startMonth}
                  onChange={e => setStartMonth(e.target.value)}
                >
                  <option value=''>All</option>
                  {availableMonths &&
                    availableMonths.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                To:
                <select
                  value={endMonth}
                  onChange={e => setEndMonth(e.target.value)}
                >
                  <option value=''>All</option>
                  {availableMonths &&
                    availableMonths.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {transactions && transactions.length === 0 ? (
              <p>No Transactions Found!</p>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions?.map((t, index) => (
                      <tr key={index}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td>{t.description}</td>
                        <td>
                          <select
                            value={categoryOverride[t.id] || t.category}
                            onChange={e =>
                              setCategoryOverride(prev => ({
                                ...prev,
                                [t.id]: e.target.value
                              }))
                            }
                          >
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{t.type}</td>
                        <td>{t.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(categoryOverride).length > 0 && (
                  <button onClick={saveRecategorization} disabled={saving}>
                    {saving
                      ? 'Saving...'
                      : `Save ${Object.keys(categoryOverride).length} changes`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div>
          <p>Category Budget Benchmarking</p>
          {stats.categoryWise &&
            stats.categoryWise.map(category => {
              return (
                <React.Fragment key={category.name}>
                  {category.name === 'food' &&
                    category.value > 0.4 * stats.totalExpense && (
                      <div>
                        <p>Food Budget</p>
                        <p>
                          Your spending on food is {category.value}. The
                          recommended budget for food is around 10-15% of your
                          total income.
                        </p>
                      </div>
                    )}
                  {category.name === 'entertainment' &&
                    category.value > 0.1 * stats.totalExpense && (
                      <div>
                        <p>Entertainment Budget</p>
                        <p>
                          Your spending on entertainment is {category.value}.
                          The recommended budget for entertainment is around
                          5-10% of your total income.
                        </p>
                      </div>
                    )}
                </React.Fragment>
              )
            })}
        </div>
        {Object.keys(dataQuality).length > 0 && (
          <div>
            <p>Data Quality Panel</p>
            <ul>
              <li>Total Transactions: {dataQuality.totalTransactions}</li>
              <li>Date Range: {dataQuality.dateRange}</li>
              <li>
                Missing Months:{' '}
                {dataQuality.missingMonths.length === 0
                  ? 'None'
                  : dataQuality.missingMonths.join(', ')}
              </li>
              <li>Negative Anomalies Detected: {dataQuality.anomalies}</li>
              <li>
                Categories Auto-Mapped:{' '}
                {dataQuality.uniqueCategories.join(', ')}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default page
