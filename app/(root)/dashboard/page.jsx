'use client'

import React, { use } from 'react'
import { useState, useEffect } from 'react'
import { Pie, PieChart } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
      const categoryWise = transactions.reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
        return acc;
      })
      const transactionCount = transactions.length;

      setStats({
        totalIncome,
        totalExpense,
        balance,
        categoryWise,
        transactionCount
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

  console.log(stats.categoryWise);

  return (
    <div>
      <div>
        {stats.categoryWise && <PieChart style={{width: '100%', maxWidth: '500px', maxHeight: '80vh', aspectRatio: 2}} responsive>
          <Pie dataKey="value" startAngle={180} endAngle={0} data={stats.categoryWise} cx='50%' cy='100%' outerRadius='120%' isAnimationActive={true} label />
        </PieChart>}
      </div>
    </div>
  )
}

export default page