'use client'

import React, { use } from 'react'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Pie, PieChart, Cell } from 'recharts'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { LineChart, Line } from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import PageHeader from '@/components/PageHeader'

const page = () => {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})
  const [score, setScore] = useState(0)
  const [analytics, setAnalytics] = useState({})
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')
  const [dataQuality, setDataQuality] = useState({})
  const [categoryOverride, setCategoryOverride] = useState({})
  const [saving, setSaving] = useState(false)
  const [drillDown, setDrillDown] = useState(null)
  const [activeChart, setActiveChart] = useState('bar')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [loading, setLoading] = useState(true)

  const drillDownTransactions = useMemo(() => {
    if (!drillDown) return []
    return transactions?.filter(t => {
      const resolvedCategory = categoryOverride[t.id] || t.category
      return resolvedCategory === drillDown
    })
  }, [drillDown, transactions, categoryOverride])

  const getData = async () => {
    try {
      const res = await fetch('/api/fetch/transactions')
      const data = await res.json()
      console.log(data)
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Failed to fetch transactions', err)
      setTransactions([])
    } finally {
      setLoading(false)
    }
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
        if (t.type !== 'DEBIT') return acc
        const category =
          String(t.category || 'Uncategorized').trim() || 'Uncategorized'
        if (!acc[category]) acc[category] = 0
        acc[category] += t.amount
        return acc
      }, {})
      const categoryWise = Object.entries(rawCategoryWise).map(
        ([key, value]) => ({ name: key, value })
      )
      const monthlyExpense = data.reduce((acc, t) => {
        if (t.type === 'CREDIT') return acc
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric'
        })
        if (!acc[month]) acc[month] = 0
        acc[month] += t.amount
        return acc
      }, {})
      const monthlyIncome = data.reduce((acc, t) => {
        if (t.type === 'DEBIT') return acc
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric'
        })
        if (!acc[month]) acc[month] = 0
        acc[month] += t.amount
        return acc
      }, {})
      const monthlyExpenseData = Object.entries(monthlyExpense).map(
        ([key, value]) => ({ month: key, expense: value })
      )
      const monthlyIncomeData = Object.entries(monthlyIncome).map(
        ([key, value]) => ({ month: key, income: value })
      )
      const monthlyData = data.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric'
        })
        if (!acc[month]) acc[month] = { month, income: 0, expense: 0 }
        if (t.type === 'CREDIT') acc[month].income += t.amount
        else acc[month].expense += t.amount
        return acc
      }, {})
      const monthlyDataObject = Object.entries(monthlyData)
        .map(([key, value]) => ({
          month: key,
          income: value.income,
          expense: value.expense
        }))
        .sort((a, b) => new Date(a.month) - new Date(b.month))
      const transactionCount = data.length
      const maxExpenseCategory = categoryWise.reduce(
        (max, category) => (max.value > category.value ? max : category),
        { name: '', value: 0 }
      )
      const maxExpense = data.reduce(
        (max, t) => {
          if (t.type === 'CREDIT') return max
          return max.amount > t.amount ? max : t
        },
        { amount: 0 }
      )
      const averageDailyExpense =
        monthlyExpenseData.length > 0
          ? totalExpense / monthlyExpenseData.length
          : 0
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
    }
  }

  const advisory = () => {
    if (filteredTransactions.length > 0) {
      const monthlyDataObject = stats.monthlyDataObject
      if (!monthlyDataObject?.length) return
      let curScore = 0
      let deficitMonths = 0
      for (let i = monthlyDataObject.length - 1; i >= 0; i--) {
        if (monthlyDataObject[i].expense > monthlyDataObject[i].income)
          deficitMonths++
        else break
      }
      if (deficitMonths >= 3) curScore += 3
      else if (deficitMonths > 0) curScore += 1
      const totalIncome = stats.totalIncome || 0
      const totalExpense = stats.totalExpense || 0
      const savingsRates =
        totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
      if (savingsRates < 5) curScore += 3
      else if (savingsRates < 10) curScore += 1
      const emiRate = 0
      const expenseToIncomeRatio =
        totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
      if (expenseToIncomeRatio > 90) curScore += 3
      else if (expenseToIncomeRatio > 75) curScore += 1
      let spikes = 0
      for (let i = 1; i < monthlyDataObject.length; i++) {
        if (
          monthlyDataObject[i].expense >
          1.5 * monthlyDataObject[i - 1].expense
        )
          spikes++
      }
      if (spikes >= 2) curScore += 3
      else if (spikes === 1) curScore += 1
      let isIncreasing = false
      if (monthlyDataObject.length >= 3) {
        const last3Months = monthlyDataObject.slice(-3)
        isIncreasing = last3Months.every((val, i, arr) => {
          if (i === 0) return true
          return val.expense > arr[i - 1].expense
        })
      }
      if (isIncreasing) curScore += 3
      let incomeDropPercent = 0
      let incomeDropContext = ''
      const sortedMonthly = [...monthlyDataObject].sort(
        (a, b) => new Date(a.month) - new Date(b.month)
      )
      if (sortedMonthly.length >= 2) {
        const lastMonth = sortedMonthly[sortedMonthly.length - 1]
        const prevMonth = sortedMonthly[sortedMonthly.length - 2]
        if (prevMonth.income > 0) {
          incomeDropPercent =
            ((prevMonth.income - lastMonth.income) / prevMonth.income) * 100
          if (incomeDropPercent > 10) {
            incomeDropContext = `${
              prevMonth.month
            } (₹${prevMonth.income.toLocaleString()}) → ${
              lastMonth.month
            } (₹${lastMonth.income.toLocaleString()})`
          }
        }
      }
      if (incomeDropPercent > 20) curScore += 3
      else if (incomeDropPercent > 10) curScore += 1
      for (let t of filteredTransactions) {
        if (t.type === 'DEBIT' && t.amount > 0.5 * stats.totalIncome) {
          curScore += 3
          break
        }
      }
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
        if (monthDiff > 1)
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
      ].filter(
        c => c && c !== 'Income' && c !== 'Food' && c !== 'Entertainment'
      )
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
        isIncreasing,
        incomeDropPercent
      })
    }
  }

  const availableMonths = stats?.monthlyDataObject?.map(d => d.month) ?? []

  const deleteTransaction = async id => {
    try {
      const res = await fetch('/api/delete/transaction', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!res.ok) throw new Error('Failed to delete')
      // Remove from local state instantly — no need to refetch
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const saveRecategorization = async () => {
    setSaving(true)
    try {
      const update = Object.entries(categoryOverride).map(([id, category]) => ({
        id,
        category
      }))
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const exportPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const W = 210
    const margin = 14
    const col = margin
    let y = 0
    pdf.setFillColor(99, 102, 241)
    pdf.rect(0, 0, W, 22, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FinGuard Financial Report', col, 14)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(new Date().toLocaleDateString(), W - margin, 14, {
      align: 'right'
    })
    y = 32
    const riskLabel =
      score < 5 ? 'LOW RISK' : score < 10 ? 'MODERATE RISK' : 'HIGH RISK'
    const riskColor =
      score < 5 ? [34, 197, 94] : score < 10 ? [245, 158, 11] : [239, 68, 68]
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
    const cards = [
      {
        label: 'Total Income',
        value: `₹${stats.totalIncome?.toLocaleString()}`,
        color: [34, 197, 94]
      },
      {
        label: 'Total Expense',
        value: `₹${stats.totalExpense?.toLocaleString()}`,
        color: [239, 68, 68]
      },
      {
        label: 'Balance',
        value: `₹${stats.balance?.toLocaleString()}`,
        color: [99, 102, 241]
      },
      {
        label: 'Transactions',
        value: stats.transactionCount,
        color: [14, 165, 233]
      }
    ]
    const cardW = (W - margin * 2 - 9) / 4
    cards.forEach((card, i) => {
      const x = col + i * (cardW + 3)
      pdf.setFillColor(245, 245, 255)
      pdf.roundedRect(x, y, cardW, 18, 2, 2, 'F')
      pdf.setDrawColor(...card.color)
      pdf.setLineWidth(0.8)
      pdf.line(x, y, x, y + 18)
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
    const sectionTitle = title => {
      pdf.setFillColor(240, 240, 255)
      pdf.rect(col, y, W - margin * 2, 7, 'F')
      pdf.setTextColor(99, 102, 241)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text(title, col + 2, y + 5)
      y += 11
    }
    sectionTitle('Advisory Flags')
    const flags = [
      analytics.deficitMonths > 0 &&
        `Deficit for ${analytics.deficitMonths} consecutive month(s)`,
      analytics.savingsRates < 10 &&
        `Low savings rate: ${analytics.savingsRates?.toFixed(1)}%`,
      analytics.expenseToIncomeRatio > 75 &&
        `High expense-to-income ratio: ${analytics.expenseToIncomeRatio?.toFixed(
          1
        )}%`,
      analytics.spikes > 0 &&
        `${analytics.spikes} unusual expense spike(s) detected`,
      analytics.isIncreasing &&
        `Expenses rising consistently over last 3 months`,
      analytics.incomeDropPercent > 10 &&
        `Income dropped by ${analytics.incomeDropPercent?.toFixed(1)}%`
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
    sectionTitle('Category Breakdown')
    pdf.setFontSize(8)
    const tableColors = [99, 102, 241]
    pdf.setFillColor(...tableColors)
    pdf.rect(col, y, W - margin * 2, 7, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Category', col + 2, y + 5)
    pdf.text('Amount (₹)', col + 80, y + 5)
    pdf.text('% of Expenses', col + 120, y + 5)
    y += 7
    stats.categoryWise?.forEach((cat, i) => {
      const bg = i % 2 === 0 ? [252, 252, 255] : [245, 245, 255]
      pdf.setFillColor(...bg)
      pdf.rect(col, y, W - margin * 2, 6, 'F')
      pdf.setTextColor(50, 50, 50)
      pdf.setFont('helvetica', 'normal')
      pdf.text(cat.name, col + 2, y + 4)
      pdf.text(`₹${cat.value.toLocaleString()}`, col + 80, y + 4)
      pdf.text(
        `${((cat.value / stats.totalExpense) * 100).toFixed(1)}%`,
        col + 120,
        y + 4
      )
      const barW = (cat.value / stats.totalExpense) * 50
      pdf.setFillColor(99, 102, 241)
      pdf.rect(col + 148, y + 1.5, barW, 3, 'F')
      y += 6
    })
    y += 8
    if (y > 230) {
      pdf.addPage()
      y = 14
    }
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
      if (y > 270) {
        pdf.addPage()
        y = 14
      }
      const savings = m.income - m.expense
      const bg = i % 2 === 0 ? [252, 252, 255] : [245, 245, 255]
      pdf.setFillColor(...bg)
      pdf.rect(col, y, W - margin * 2, 6, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(50, 50, 50)
      pdf.text(m.month, col + 2, y + 4)
      pdf.text(`₹${m.income.toLocaleString()}`, col + 55, y + 4)
      pdf.text(`₹${m.expense.toLocaleString()}`, col + 100, y + 4)
      pdf.setTextColor(
        savings >= 0 ? 34 : 239,
        savings >= 0 ? 197 : 68,
        savings >= 0 ? 94 : 68
      )
      pdf.text(`₹${savings.toLocaleString()}`, col + 145, y + 4)
      y += 6
    })
    y += 8
    if (y > 240) {
      pdf.addPage()
      y = 14
    }
    sectionTitle('Data Quality')
    pdf.setTextColor(80, 80, 80)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const dqLines = [
      `Total Transactions: ${dataQuality.totalTransactions}`,
      `Date Range: ${dataQuality.dateRange}`,
      `Missing Months: ${
        dataQuality.missingMonths?.length === 0
          ? 'None'
          : dataQuality.missingMonths?.join(', ')
      }`,
      `Anomalies Detected: ${dataQuality.anomalies}`
    ]
    dqLines.forEach(line => {
      pdf.text(line, col, y)
      y += 6
    })
    const totalPages = pdf.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p)
      pdf.setFillColor(240, 240, 255)
      pdf.rect(0, 287, W, 10, 'F')
      pdf.setTextColor(150, 150, 150)
      pdf.setFontSize(7)
      pdf.text('Generated by FinGuard', col, 293)
      pdf.text(`Page ${p} of ${totalPages}`, W - margin, 293, {
        align: 'right'
      })
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

  // ── Risk config ──────────────────────────────────────────
  const riskLabel =
    score < 5 ? 'Low Risk' : score < 10 ? 'Moderate Risk' : 'High Risk'
  const riskColor =
    score < 5 ? 'text-success' : score < 10 ? 'text-warning' : 'text-danger'
  const riskBg =
    score < 5
      ? 'bg-success/10 border-success/20'
      : score < 10
      ? 'bg-warning/10 border-warning/20'
      : 'bg-danger/10 border-danger/20'

  const advisoryFlags =
    Object.keys(analytics).length > 0
      ? [
          analytics.deficitMonths > 0 && {
            label: 'Persistent Deficit',
            desc: `Expenses exceeded income for ${analytics.deficitMonths} consecutive month(s).`,
            severity: 'high'
          },
          analytics.savingsRates < 10 && {
            label: 'Low Savings Rate',
            desc: `Your savings rate is ${analytics.savingsRates?.toFixed(
              1
            )}%, below the recommended 20%.`,
            severity: analytics.savingsRates < 5 ? 'high' : 'medium'
          },
          analytics.expenseToIncomeRatio > 75 && {
            label: 'High Expense Ratio',
            desc: `Expense-to-income ratio is ${analytics.expenseToIncomeRatio?.toFixed(
              1
            )}%.`,
            severity: analytics.expenseToIncomeRatio > 90 ? 'high' : 'medium'
          },
          analytics.spikes > 0 && {
            label: 'Expense Spikes',
            desc: `${analytics.spikes} unusual expense spike(s) detected.`,
            severity: 'medium'
          },
          analytics.isIncreasing && {
            label: 'Rising Expenses',
            desc: 'Expenses have been increasing consistently over the last 3 months.',
            severity: 'medium'
          },
          analytics.incomeDropPercent > 10 && {
            label: 'Income Drop',
            desc: `Income dropped by ${analytics.incomeDropPercent?.toFixed(
              1
            )}% recently.`,
            severity: 'high'
          }
        ].filter(Boolean)
      : []

  const uncategorizedAmount =
    stats.categoryWise?.find(c => c.name === 'Uncategorized')?.value || 0
  const uncategorizedPercent =
    stats.totalExpense > 0
      ? (uncategorizedAmount / stats.totalExpense) * 100
      : 0

  const scoreExplanationItems = [
    {
      label: 'FinGuard Score',
      value: score,
      description:
        'A higher score means more financial risk. It is built from the advisory drivers below.'
    },
    {
      label: 'Persistent Deficit',
      value:
        analytics.deficitMonths > 0
          ? `${analytics.deficitMonths} month(s)`
          : 'None',
      description:
        'If recent months spent more than earned, this raises your risk score because it signals cash flow stress.'
    },
    {
      label: 'Savings Rate',
      value:
        analytics.savingsRates != null
          ? `${analytics.savingsRates.toFixed(1)}%`
          : 'N/A',
      description:
        'Calculated as (income − expense) ÷ income. A healthy buffer is typically 20% or more.'
    },
    {
      label: 'Expense Ratio',
      value:
        analytics.expenseToIncomeRatio != null
          ? `${analytics.expenseToIncomeRatio.toFixed(1)}%`
          : 'N/A',
      description:
        'Shows how much of your income is used for expenses. Higher ratios leave less room for savings and emergencies.'
    },
    {
      label: 'Expense Spikes',
      value: analytics.spikes ?? 0,
      description:
        'Large month-to-month jumps in spending are flagged because they can indicate unstable or unusual costs.'
    },
    {
      label: 'Income Drop',
      value:
        analytics.incomeDropPercent != null
          ? `${analytics.incomeDropPercent.toFixed(1)}%`
          : 'N/A',
      description:
        'Recent income falls increase risk, especially when expenses remain high or unchanged.'
    }
  ]

  const scoreExplanationNote =
    uncategorizedPercent > 0
      ? `Note: ${uncategorizedPercent.toFixed(
          1
        )}% of expense transactions are still categorized as Uncategorized, so category-level insights may be incomplete.`
      : 'All expenses are categorized, so category-level insights are more reliable.'

  const customTooltipStyle = {
    backgroundColor: '#1e2130',
    border: '1px solid #2a2d3e',
    borderRadius: '8px',
    fontSize: '12px',
    padding: '8px 12px'
  }

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={customTooltipStyle}>
        {label && (
          <p style={{ color: '#6366f1', margin: '0 0 4px', fontWeight: 500 }}>
            {label}
          </p>
        )}
        {payload.map((entry, i) => (
          <p key={i} style={{ color: '#6366f1', margin: 0 }}>
            {entry.name}: {entry.value?.toLocaleString?.() ?? entry.value}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Dashboard'
        subtitle={
          dataQuality.dateRange
            ? `Phase 2: Your financial overview · ${dataQuality.dateRange}`
            : 'Phase 2: Your financial overview'
        }
        badge='Phase 2'
      >
        <button onClick={exportPDF} className='btn-ghost text-sm'>
          ↓ Export PDF
        </button>
      </PageHeader>

      {loading ? (
        <div className='flex items-center justify-center h-64'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin' />
            <p className='text-text-secondary text-sm'>Loading your data...</p>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className='flex items-center justify-center h-64'>
          <div className='flex flex-col items-center gap-4'>
            <p className='text-text-primary text-lg font-medium'>
              No transactions found
            </p>
            <p className='text-text-secondary text-sm'>
              Please upload data to get started.
            </p>
            <Link
              href={'/upload'}
              className='px-4 py-2 bg-accent text-white rounded'
            >
              Upload data
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className='stagger-item grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {[
              {
                label: 'Total Income',
                value: `₹${stats.totalIncome?.toLocaleString()}`,
                sub: `${stats.transactionCount} transactions`,
                color: 'text-success',
                border: 'border-success/20',
                dot: 'bg-success'
              },
              {
                label: 'Total Expenses',
                value: `₹${stats.totalExpense?.toLocaleString()}`,
                sub: `Avg ₹${stats.averageDailyExpense?.toFixed(0)}/month`,
                color: 'text-danger',
                border: 'border-danger/20',
                dot: 'bg-danger'
              },
              {
                label: 'Net Balance',
                value: `₹${stats.balance?.toLocaleString()}`,
                sub: stats.balance >= 0 ? 'In the green' : 'Overspent',
                color: stats.balance >= 0 ? 'text-success' : 'text-danger',
                border:
                  stats.balance >= 0 ? 'border-success/20' : 'border-danger/20',
                dot: stats.balance >= 0 ? 'bg-success' : 'bg-danger'
              },
              {
                label: 'FinGuard Score',
                value: `${score}/15`,
                sub: riskLabel,
                color: riskColor,
                border: 'border-accent/20',
                dot: 'bg-accent'
              }
            ].map((card, i) => (
              <div
                key={i}
                className={`bg-bg-card border ${
                  card.border
                } rounded-xl p-4 transition-all duration-250 ${
                  card.label === 'FinGuard Score'
                    ? 'hover:shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_8px_32px_rgba(99,102,241,0.16)]'
                    : ''
                }`}
              >
                <div className='flex items-center gap-2 mb-3'>
                  <div className={`w-2 h-2 rounded-full ${card.dot}`} />
                  <p className='text-text-secondary text-xs'>{card.label}</p>
                </div>
                <p className={`text-2xl font-semibold ${card.color}`}>
                  {card.value}
                </p>
                <p className='text-text-secondary text-xs mt-1'>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Charts section ── */}
          <div className='stagger-item grid grid-cols-1 lg:grid-cols-3 gap-4'>
            {/* Bar / Line chart — 2/3 width */}
            <div className='lg:col-span-2 bg-bg-card border border-border rounded-xl p-5'>
              <div className='flex items-center justify-between mb-5'>
                <div>
                  <p className='text-text-primary font-medium text-sm'>
                    Income vs Expenses
                  </p>
                  <p className='text-text-secondary text-xs mt-0.5'>
                    Monthly breakdown
                  </p>
                </div>
                <div className='flex gap-1'>
                  {['bar', 'line'].map(type => (
                    <button
                      key={type}
                      onClick={() => setActiveChart(type)}
                      className={`px-3 py-1 rounded-md text-xs transition-colors
                        ${
                          activeChart === type
                            ? 'bg-accent text-white'
                            : 'text-text-secondary hover:text-text-primary bg-bg-secondary'
                        }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {activeChart === 'bar' && stats.monthlyDataObject && (
                <BarChart
                  width={480}
                  height={220}
                  data={stats.monthlyDataObject}
                >
                  <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' />
                  <XAxis
                    dataKey='month'
                    tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey='income'
                    fill='#22C55E'
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                  />
                  <Bar
                    dataKey='expense'
                    fill='#6366F1'
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                  />
                  <Legend
                    wrapperStyle={{
                      color: '#b0b8c5',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  />
                </BarChart>
              )}

              {activeChart === 'line' && stats.monthlyExpenseData && (
                <LineChart
                  width={480}
                  height={220}
                  data={stats.monthlyDataObject}
                >
                  <CartesianGrid strokeDasharray='3 3' stroke='#2a2d3e' />
                  <XAxis
                    dataKey='month'
                    tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#b0b8c5', fontSize: 13, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type='monotone'
                    dataKey='income'
                    stroke='#22C55E'
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                  />
                  <Line
                    type='monotone'
                    dataKey='expense'
                    stroke='#6366F1'
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                  />
                  <Legend
                    wrapperStyle={{
                      color: '#b0b8c5',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  />
                </LineChart>
              )}
            </div>

            {/* Pie chart — 1/3 width */}
            <div className='bg-bg-card border border-border rounded-xl p-5'>
              <div className='mb-5'>
                <p className='text-text-primary font-medium text-sm'>
                  Spending by Category
                </p>
                <p className='text-text-secondary text-xs mt-0.5'>
                  Click a slice to drill down
                </p>
              </div>
              {stats.categoryWise && (
                <PieChart width={200} height={180}>
                  <Pie
                    dataKey='value'
                    data={stats.categoryWise}
                    cx='50%'
                    cy='50%'
                    outerRadius={80}
                    isAnimationActive
                    onClick={data => setDrillDown(data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {stats.categoryWise.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              )}
              {/* Category legend */}
              <div className='mt-3 space-y-1.5'>
                {stats.categoryWise?.slice(0, 5).map((cat, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between cursor-pointer hover:bg-bg-secondary px-2 py-1 rounded-md transition-colors'
                    onClick={() => setDrillDown(cat.name)}
                  >
                    <div className='flex items-center gap-2'>
                      <div
                        className='w-2 h-2 rounded-full'
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className='text-text-secondary text-xs'>
                        {cat.name}
                      </span>
                    </div>
                    <span className='text-text-primary text-xs font-medium'>
                      {((cat.value / stats.totalExpense) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Drill down panel ── */}
          {drillDown && (
            <div className='bg-bg-card border border-accent/30 rounded-xl p-5'>
              <div className='flex items-center justify-between mb-4'>
                <p className='text-text-primary font-medium text-sm'>
                  Transactions in{' '}
                  <span className='text-accent'>{drillDown}</span>
                </p>
                <button
                  onClick={() => setDrillDown(null)}
                  className='text-text-secondary hover:text-text-primary text-xs border border-border px-3 py-1 rounded-md transition-colors'
                >
                  Clear
                </button>
              </div>
              <div className='space-y-2 max-h-48 overflow-y-auto'>
                {drillDownTransactions?.map((t, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between py-2 border-b border-border/50 last:border-0'
                  >
                    <div>
                      <p className='text-text-primary text-sm'>
                        {t.description}
                      </p>
                      <p className='text-text-secondary text-xs'>
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className='text-danger text-sm font-medium'>
                      ₹{t.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Advisory flags + score explanation (stacked full-width) ── */}
          <div className='space-y-6'>
            <div className='bg-bg-card border border-border rounded-xl p-5 w-full'>
              <div className='flex items-center gap-2 mb-4'>
                <p className='text-text-primary font-medium text-sm'>
                  Advisory Flags
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${riskBg} ${riskColor}`}
                >
                  {riskLabel} · Score {score}
                </span>
              </div>

              {advisoryFlags.length > 0 ? (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {advisoryFlags.map((flag, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 p-3 rounded-lg border
                          ${
                            flag.severity === 'high'
                              ? 'bg-danger/5 border-danger/20'
                              : 'bg-warning/5 border-warning/20'
                          }`}
                    >
                      <span
                        className={
                          flag.severity === 'high'
                            ? 'text-danger'
                            : 'text-warning'
                        }
                      >
                        ⚠
                      </span>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            flag.severity === 'high'
                              ? 'text-danger'
                              : 'text-warning'
                          }`}
                        >
                          {flag.label}
                        </p>
                        <p className='text-text-secondary text-xs mt-0.5'>
                          {flag.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-2xl border border-border/70 bg-bg-secondary p-4 text-text-secondary text-sm'>
                  No advisory flags detected. Your score is still based on cash
                  flow, savings, and expense behavior.
                </div>
              )}

              <div className='mt-4 p-3 bg-bg-secondary rounded-lg border border-border'>
                <p className='text-text-secondary text-xs leading-relaxed'>
                  <span className='text-text-primary font-medium'>
                    Summary —{' '}
                  </span>
                  You are currently in a{' '}
                  <span className={riskColor}>{riskLabel.toLowerCase()}</span>{' '}
                  zone.{' '}
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
            </div>

            <div className='rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950/70 to-slate-900/85 p-5 w-full shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition-all duration-250 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_20px_50px_rgba(99,102,241,0.12)]'>
              <div className='flex items-start justify-between gap-3 mb-4'>
                <div>
                  <p className='text-text-primary font-semibold text-sm'>
                    FinGuard score explanation
                  </p>
                  <p className='text-text-secondary text-xs mt-1'>
                    Key factors that influence your current risk score.
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${riskBg} ${riskColor}`}
                >
                  {riskLabel}
                </span>
              </div>

              <div className='space-y-3'>
                {scoreExplanationItems.map((item, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-bg-secondary px-3 py-3'
                  >
                    <div>
                      <p className='text-sm font-medium text-text-primary'>
                        {item.label}
                      </p>
                      <p className='text-text-secondary text-xs mt-1'>
                        {item.description}
                      </p>
                    </div>
                    <p className='text-text-primary text-sm font-semibold'>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <p className='mt-4 text-xs text-text-secondary leading-relaxed'>
                {scoreExplanationNote}
              </p>
            </div>
          </div>

          {/* ── Transactions section ── */}
          <div className='bg-bg-card border border-border rounded-xl'>
            {/* Header + filters */}
            <div className='p-5 border-b border-border'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div>
                  <p className='text-text-primary font-medium text-sm'>
                    Transactions
                  </p>
                  <p className='text-text-secondary text-xs mt-0.5'>
                    {filteredTransactions.length} of {transactions.length} shown
                  </p>
                </div>
                <div className='flex gap-3'>
                  {[
                    {
                      label: 'From',
                      value: startMonth,
                      onChange: setStartMonth
                    },
                    { label: 'To', value: endMonth, onChange: setEndMonth }
                  ].map(({ label, value, onChange }) => (
                    <div key={label} className='flex items-center gap-2'>
                      <label className='text-text-secondary text-xs'>
                        {label}
                      </label>
                      <select
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className='bg-bg-secondary border border-border rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent'
                      >
                        <option value=''>All</option>
                        {availableMonths.map(m => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className='overflow-x-auto max-h-[32rem] overflow-y-auto'>
              {transactions.length === 0 ? (
                <div className='flex items-center justify-center h-32'>
                  <p className='text-text-secondary text-sm'>
                    No transactions found
                  </p>
                </div>
              ) : (
                <table className='min-w-full table-fixed text-sm'>
                  <thead className='sticky top-0 z-10 bg-bg-secondary/95 backdrop-blur-sm shadow-sm'>
                    <tr>
                      {[
                        'Date',
                        'Description',
                        'Category',
                        'Type',
                        'Amount',
                        'Actions'
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
                    {filteredTransactions.map((t, index) => (
                      <tr
                        key={index}
                        className='border-t border-border/50 hover:bg-bg-secondary/50 transition-colors'
                      >
                        <td className='px-4 py-3 text-text-secondary text-xs whitespace-nowrap'>
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className='px-4 py-3 text-text-primary text-xs max-w-[12rem] truncate'>
                          {t.description}
                        </td>
                        <td className='px-4 py-3 whitespace-nowrap'>
                          <select
                            value={categoryOverride[t.id] || t.category}
                            onChange={e =>
                              setCategoryOverride(prev => ({
                                ...prev,
                                [t.id]: e.target.value
                              }))
                            }
                            className='bg-bg-secondary border border-border rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-accent'
                          >
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className='px-4 py-3 whitespace-nowrap'>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border
                  ${
                    t.type === 'CREDIT'
                      ? 'text-success bg-success/10 border-success/20'
                      : 'text-danger bg-danger/10 border-danger/20'
                  }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                            t.type === 'CREDIT' ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {t.type === 'CREDIT' ? '+' : '-'}₹
                          {t.amount?.toLocaleString()}
                        </td>

                        {/* ── Delete cell ── */}
                        <td className='px-4 py-3 whitespace-nowrap'>
                          {confirmDelete === t.id ? (
                            // Two-step confirm — shows inline after first click
                            <div className='flex items-center gap-2'>
                              <button
                                onClick={() => {
                                  deleteTransaction(t.id)
                                  setConfirmDelete(null)
                                }}
                                className='text-xs text-danger hover:text-red-400 border border-danger/30 bg-danger/10 px-2 py-0.5 rounded transition-colors'
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className='text-xs text-text-secondary hover:text-text-primary transition-colors'
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(t.id)}
                              className='text-text-secondary hover:text-danger transition-colors text-xs border border-transparent hover:border-danger/30 px-2 py-0.5 rounded'
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Save recategorization */}
            {Object.keys(categoryOverride).length > 0 && (
              <div className='p-4 border-t border-border flex items-center justify-between'>
                <p className='text-text-secondary text-xs'>
                  {Object.keys(categoryOverride).length} unsaved change(s)
                </p>
                <button
                  onClick={saveRecategorization}
                  disabled={saving}
                  className='px-4 py-2 bg-accent hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors'
                >
                  {saving ? 'Saving...' : `Save changes`}
                </button>
              </div>
            )}
          </div>

          {/* ── Under the hood ── */}
          <div className='bg-bg-card border border-border rounded-xl p-5'>
            <p className='text-xs font-medium text-text-secondary uppercase tracking-widest mb-4'>
              Under the hood
            </p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {[
                {
                  step: '01',
                  title: 'Transaction grouping',
                  desc: 'Transactions are aggregated by category and type (credit/debit). Monthly summaries group by date to identify spending patterns and income trends.'
                },
                {
                  step: '02',
                  title: 'Anomaly detection',
                  desc: 'Statistical outliers are identified when transactions deviate significantly from monthly averages. Flagged anomalies help catch unusual spending or income patterns.'
                },
                {
                  step: '03',
                  title: 'Score calculation',
                  desc: 'FinGuard Score (out of 15) combines expense tracking compliance, spending volatility, anomaly count, and savings consistency. Higher scores indicate better financial discipline.'
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

          {/* ── Data quality ── */}
          {Object.keys(dataQuality).length > 0 && (
            <div className='bg-bg-card border border-border rounded-xl p-5'>
              <p className='text-xs font-medium text-text-secondary uppercase tracking-widest mb-4'>
                Data Quality
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'>
                {[
                  {
                    label: 'Total Transactions',
                    value: dataQuality.totalTransactions
                  },
                  { label: 'Date Range', value: dataQuality.dateRange },
                  {
                    label: 'Missing Months',
                    value:
                      dataQuality.missingMonths?.length === 0
                        ? 'None'
                        : dataQuality.missingMonths?.join(', ')
                  },
                  { label: 'Anomalies Detected', value: dataQuality.anomalies }
                ].map((item, i) => (
                  <div key={i}>
                    <p className='text-text-secondary text-xs mb-1'>
                      {item.label}
                    </p>
                    <p className='text-text-primary text-sm font-medium'>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default page
