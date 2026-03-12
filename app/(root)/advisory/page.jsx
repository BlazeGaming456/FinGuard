'use client'

import React from 'react'
import { useState, useEffect } from 'react'

const page = () => {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})

  const getData = async () => {
    const res = await fetch('/api/fetch/transactions')
    const data = await res.json()

    console.log(data)
    setTransactions(data.transactions)
  }

  const statistics = async () => {
    if (transactions.length > 0) {
      const totalIncome = transactions
        .filter(t => t.type === 'CREDIT')
        .reduce((acc, t) => acc + t.amount, 0)
      const totalExpense = transactions
        .filter(t => t.type === 'DEBIT')
        .reduce((acc, t) => acc + t.amount, 0)
      const balance = totalIncome - totalExpense
      const rawCategoryWise = transactions.reduce((acc, t) => {
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
      const monthlyExpense = transactions.reduce((acc, t) => {
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
      const monthlyIncome = transactions.reduce((acc, t) => {
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
      const monthlyData = transactions.reduce((acc, t) => {
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
      const transactionCount = transactions.length
      const maxExpenseCategory = categoryWise.reduce(
        (max, category) => {
          max = max.value > category.value ? max : category
          return max
        },
        { name: '', value: 0 }
      )
      const maxExpense = transactions.reduce(
        (max, t) => {
          if (t.type === 'CREDIT') return max
          max = max.amount > t.amount ? max : t
          return max
        },
        { amount: 0 }
      )
      const averageDailyExpense = totalExpense / monthlyExpenseData.length
    }
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
  return <div>
    {s}
  </div>
}

export default page
