'use client'

import React, { use } from 'react'
import { useState, useEffect } from 'react'

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

  return (
    <div>Add visuals here</div>
  )
}

export default page