'use client'

import React from 'react'
import { useState } from 'react'
import Papa from 'papaparse'

const page = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)

  const saveTransactions = async (transactions) => {
    await fetch('/api/save/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactions)
    })
  }

  const headerMap = {
    date: ["date", "transaction date", "value date", "txn date"],
    description: ["description", "narration", "remarks", "details"],
    amount: ["amount"],
    type: ["type", "transaction type"],
    category: ["category", "categories", "cat"]
  }

  const normalizeData = (data) => {
    return data.trim().toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
  }

  const mapHeaders = (headers) => {
    const mappedHeaders = {}
    for (let rawHeader of headers) {
      const normalized = normalizeData(rawHeader)
      for (let key in headerMap) {
        if (headerMap[key].includes(normalized)) {
          mappedHeaders[rawHeader] = key
        }
      }
    }
    return mappedHeaders
  }

  const validateHeaders = (mappedHeaders) => {
    if (!mappedHeaders.date || !mappedHeaders.description || !mappedHeaders.amount || !mappedHeaders.type || !mappedHeaders.category) {
      alert("CSV file is missing required headers. Please ensure it includes date, description, amount, type, and category.")
      return false
    }
    return true
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    processFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  const processFile = async (file) => {
    if (!file) return
    setSelectedFile(file)
    setUploadDone(false)
    setParsedData(null)

    if (file.type !== 'text/csv') {
      alert('Invalid file type. Please upload a CSV file.')
      return
    }
    if (file.size === 0) {
      alert('File is empty. Please upload a non-empty CSV file.')
      return
    }

    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async results => {
        const csvHeaders = Object.keys(results.data[0])
        const mappedHeaders = mapHeaders(csvHeaders)
        if (validateHeaders(mappedHeaders) === false) {
          setIsUploading(false)
          return
        }

        const normalizedData = results.data.map(row => {
          const newRow = {}
          for (let key in row) {
            const normalizedKey = mappedHeaders[key] || key
            newRow[normalizedKey] = row[key]
          }
          newRow.transaction_id = crypto.randomUUID()
          return newRow
        })

        setParsedData(normalizedData)
        await saveTransactions(normalizedData)
        setIsUploading(false)
        setUploadDone(true)
      }
    })
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Upload Transactions</h1>
        <p className="text-text-secondary text-sm mt-1">
          Upload your bank statement CSV to analyse your finances
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border bg-bg-card hover:border-accent/50 hover:bg-bg-card/80'
          }`}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input
          id="fileInput"
          type='file'
          onChange={handleFileChange}
          accept='.csv'
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">Parsing and saving transactions...</p>
          </div>
        ) : uploadDone ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <span className="text-success text-2xl">✓</span>
            </div>
            <p className="text-success font-medium">Upload successful</p>
            <p className="text-text-secondary text-sm">{selectedFile?.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setUploadDone(false); setParsedData(null); setSelectedFile(null) }}
              className="mt-2 text-xs text-text-secondary hover:text-text-primary underline"
            >
              Upload another file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center border border-border">
              <span className="text-2xl">↑</span>
            </div>
            <div>
              <p className="text-text-primary font-medium">
                Drop your CSV file here
              </p>
              <p className="text-text-secondary text-sm mt-1">
                or click to browse
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {["date", "description", "amount", "type", "category"].map(col => (
                <span key={col} className="px-2 py-1 bg-bg-secondary border border-border rounded text-xs text-text-secondary">
                  {col}
                </span>
              ))}
            </div>
            <p className="text-text-secondary text-xs mt-1">
              CSV must include the above columns
            </p>
          </div>
        )}
      </div>

      {/* Under the hood */}
      <div className="mt-6 bg-bg-card border border-border rounded-xl p-5">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-3">
          Under the hood
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Header mapping", desc: "Fuzzy matches your CSV headers to standard fields — works with any bank format" },
            { step: "02", title: "Validation", desc: "Checks for required columns, empty files, and invalid formats before processing" },
            { step: "03", title: "Storage", desc: "Transactions saved to PostgreSQL via Prisma with duplicate detection using transaction IDs" },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <span className="text-accent font-mono text-sm mt-0.5">{item.step}</span>
              <div>
                <p className="text-text-primary text-sm font-medium">{item.title}</p>
                <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction preview table */}
      {parsedData && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-medium">
              Preview
              <span className="ml-2 text-xs text-text-secondary font-normal">
                {parsedData.length} transactions
              </span>
            </h2>
          </div>

          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {Object.keys(parsedData[0]).map((key, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/50 hover:bg-bg-secondary/50 transition-colors"
                    >
                      {Object.values(row).map((value, idx) => (
                        <td key={idx} className="px-4 py-3 text-text-secondary text-xs">
                          {String(value).length > 30
                            ? String(value).slice(0, 30) + "..."
                            : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 10 && (
              <div className="px-4 py-3 border-t border-border">
                <p className="text-text-secondary text-xs">
                  Showing 10 of {parsedData.length} transactions
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default page