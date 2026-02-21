'use client'

import React, { use } from 'react'
import { useState, useEffect } from 'react'
import { Pie, PieChart, Cell } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, TooltipIndex, Legend } from 'recharts';
import { LineChart, Line } from 'recharts';

const page = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({});

  const getData = async () => {
    const res = await fetch('/api/fetch/transactions')
    const data = await res.json();

    console.log(data);
    setTransactions(data.transactions);
  }

  const statistics = async () => {
    if (transactions.length > 0) {
      const totalIncome = transactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0);
      const balance = totalIncome - totalExpense;
      const rawCategoryWise = transactions.reduce((acc, t) => {
        if (t.category === 'Income') {
          return acc;
        }
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
        return acc;
      }, {});
      const categoryWise = Object.entries(rawCategoryWise).map(([key,value])=>{
        return {name: key, value: value};
      });
      const monthlyExpense = transactions.reduce((acc, t) => {
        if (t.type === 'CREDIT') return acc;
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        })
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += t.amount;

        return acc;
      }, {})
      const monthlyIncome = transactions.reduce((acc, t) => {
        if (t.type === 'DEBIT') return acc;
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        })
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += t.amount;

        return acc;
      }, {})
      const monthlyExpenseData = Object.entries(monthlyExpense).map(([key, value]) => {
        return { month: key, expense: value };
      });
      const monthlyIncomeData = Object.entries(monthlyIncome).map(([key, value]) => {
        return { month: key, income: value };
      });
      const monthlyData = transactions.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        })

        if (!acc[month]) {
          acc[month] = {
            month,
            income: 0,
            expense: 0,
          };
        }
        if (t.type === 'CREDIT') {
          acc[month].income += t.amount;
        } else {
          acc[month].expense += t.amount;
        }

        return acc;
      }, {})
      const monthlyDataObject = Object.entries(monthlyData).map(([key, value]) => {
        return {
          month: key,
          income: value.income,
          expense: value.expense,
        }
      });
      const transactionCount = transactions.length;
      const maxExpenseCategory = categoryWise.reduce((max, category) => {
        max = max.value > category.value ? max : category;
        return max;
      }, {name: '', value: 0})
      const maxExpense = transactions.reduce((max, t) => {
        if (t.type === 'CREDIT') return max;
        max = max.amount > t.amount ? max : t;
        return max;
      }, {amount: 0});
      const averageDailyExpense = totalExpense / monthlyExpenseData.length;

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
        monthlyDataObject,
      });

      console.log(stats);
    }
  }

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    statistics();
  }, [transactions]);

  const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#A855F7",
  "#14B8A6",
  "#F43F5E",
];

  console.log(stats.categoryWise);

  return (
    <div>
      <div>
        {Object.keys(stats).length === 0 ? (<p>Loading...</p>):(
        <div>
          <p>Here are the analytics from the given data:</p>
          <ul>
            <li>Total Income: {stats.totalIncome}</li>
            <li>Total Expense: {stats.totalExpense}</li>
            <li>Balance: {stats.balance}</li>
            <li>Transaction Count: {stats.transactionCount}</li>
            <li>Max Expense Category: {stats.maxExpenseCategory.name} ({stats.maxExpenseCategory.value})</li>
            <li>Max Expense: {stats.maxExpense.amount} ({stats.maxExpense.category})</li>
            <li>Average Daily Expense: {stats.averageDailyExpense.toFixed(2)}</li>
          </ul>
        </div>
        )}
        <div>
        {stats.categoryWise && <PieChart style={{width: '100%', maxWidth: '500px', maxHeight: '80vh', aspectRatio: 2}} responsive>
          <Pie dataKey="value" startAngle={180} endAngle={0} data={stats.categoryWise} cx='50%' cy='100%' outerRadius='120%' isAnimationActive={true} label>
            {
              stats.categoryWise.map((entry, index) => {
                return <Cell key={`cell-${index}`} fill={COLORS[index%COLORS.length]}></Cell>
              })
            }
          </Pie>
          <Tooltip />
        </PieChart>}
        {
          stats.monthlyExpenseData && stats.monthlyIncomeData && (
            <BarChart style={{width: '100%', maxWidth: '700px', maxHeight: '80vh', aspectRatio: 2}} responsive data={stats.monthlyDataObject}>
              <Bar dataKey="expense" fill="#6366F1" isAnimationActive={true}></Bar>
              <Bar dataKey="income" fill="#22C55E" isAnimationActive={true}></Bar>
              <Tooltip/>
              <XAxis dataKey="month"></XAxis>
              <YAxis name="value"/>

            </BarChart>
          )
        }
        {
          stats.monthlyExpenseData && (
            <LineChart style={{width: '100%', maxWidth: '700px', maxHeight: '80vh', aspectRatio: 2}} responsive data={stats.monthlyExpenseData}>
              <Line dataKey="expense" stroke="#6366F1" isAnimationActive={true}></Line>
              <Tooltip/>
              <XAxis dataKey="month"></XAxis>
              <YAxis name="Expense"/>
            </LineChart>
          )
        }
        </div>
      </div>
    </div>
  )
}

export default page