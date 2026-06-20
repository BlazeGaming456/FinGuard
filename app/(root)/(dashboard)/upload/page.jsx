'use client'

import React, { useState } from 'react'
import PageHeader from '@/components/PageHeader'
import {
  isCsvFile,
  isPdfFile,
  parseCsvFile,
  parsePdfFile
} from '@/lib/fileParser'

const page = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [errors, setErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)

  const saveTransactions = async transactions => {
    const response = await fetch('/api/save/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactions)
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || 'Failed to save transactions.')
    }
  }

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    await processFile(file)
  }

  const handleDrop = async e => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    await processFile(file)
  }

  const processFile = async file => {
    if (!file) return

    setSelectedFile(file)
    setParsedData(null)
    setErrors([])
    setUploadDone(false)

    if (!isCsvFile(file) && !isPdfFile(file)) {
      setErrors([
        'Unsupported file type. Please upload a CSV or PDF bank statement.'
      ])
      return
    }

    if (file.size === 0) {
      setErrors(['Uploaded file is empty. Please provide a non-empty file.'])
      return
    }

    setIsUploading(true)

    try {
      const parser = isCsvFile(file) ? parseCsvFile : parsePdfFile
      const { transactions, errors: parseErrors } = await parser(file)

      if (
        (!transactions || transactions.length === 0) &&
        parseErrors.length > 0
      ) {
        setErrors(parseErrors)
        return
      }

      if (!transactions || transactions.length === 0) {
        setErrors(['No transactions could be extracted from the file.'])
        return
      }

      if (parseErrors.length > 0) {
        setErrors(parseErrors)
        return
      }

      setParsedData(transactions)
      await saveTransactions(transactions)
      setUploadDone(true)
    } catch (error) {
      setErrors([
        error.message || 'Unexpected error while processing the file.'
      ])
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Upload Data'
        subtitle='Upload your bank statements through PDF or CSV to analyze your finances'
        badge='Phase 1'
      />

      {/* Upload area */}
      <div
        onDragOver={e => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`stagger-item relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? 'border-accent bg-accent/10'
              : 'border-border bg-bg-card hover:border-accent/50 hover:bg-bg-card/80'
          }`}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input
          id='fileInput'
          type='file'
          onChange={handleFileChange}
          accept='.csv,.pdf'
          className='hidden'
        />

        {isUploading ? (
          <div className='flex flex-col items-center gap-3'>
            <div className='w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin' />
            <p className='text-text-secondary text-sm'>
              Parsing and saving transactions...
            </p>
          </div>
        ) : uploadDone ? (
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-full bg-success/20 flex items-center justify-center'>
              <span className='text-success text-2xl'>✓</span>
            </div>
            <p className='text-success font-medium'>Upload successful</p>
            <p className='text-text-secondary text-sm'>{selectedFile?.name}</p>
            <button
              onClick={e => {
                e.stopPropagation()
                setUploadDone(false)
                setParsedData(null)
                setSelectedFile(null)
              }}
              className='mt-2 text-xs text-text-secondary hover:text-text-primary underline'
            >
              Upload another file
            </button>
          </div>
        ) : (
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center border border-border'>
              <span className='text-2xl'>↑</span>
            </div>
            <div>
              <p className='text-text-primary font-medium'>
                Drop your file here
              </p>
              <p className='text-text-secondary text-sm mt-1'>
                or click to browse
              </p>
            </div>
            <div className='flex gap-2 mt-2 flex-wrap justify-center'>
              {['date', 'description', 'amount', 'type', 'category'].map(
                col => (
                  <span
                    key={col}
                    className='px-2 py-1 bg-bg-secondary border border-border rounded text-xs text-text-secondary'
                  >
                    {col}
                  </span>
                )
              )}
            </div>
            <p className='text-text-secondary text-xs mt-1'>
              Supported formats: CSV and PDF bank statements
            </p>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className='rounded-2xl border border-red-200 bg-red-50 p-4'>
          <p className='text-sm font-semibold text-red-800 mb-3'>
            Upload validation failed
          </p>
          <ul className='list-disc list-inside text-sm text-red-700 space-y-1'>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Under the hood */}
      <div className='stagger-item glass-card rounded-2xl p-5'>
        <p className='text-xs font-medium text-text-secondary uppercase tracking-widest mb-3'>
          Under the hood
        </p>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {[
            {
              step: '01',
              title: 'Header mapping',
              desc: 'Fuzzy matches your CSV headers to standard fields — works with any bank format'
            },
            {
              step: '02',
              title: 'Validation',
              desc: 'Checks for required columns, empty files, and invalid formats before processing'
            },
            {
              step: '03',
              title: 'Storage',
              desc: 'Transactions saved to PostgreSQL via Prisma with duplicate detection using transaction IDs'
            }
          ].map(item => (
            <div key={item.step} className='flex gap-3'>
              <span className='text-accent font-mono text-sm mt-0.5'>
                {item.step}
              </span>
              <div>
                <p className='text-text-primary text-sm font-medium'>
                  {item.title}
                </p>
                <p className='text-text-secondary text-xs mt-0.5 leading-relaxed'>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction preview table */}
      {parsedData && (
        <div className='mt-8'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-text-primary font-medium'>
              Preview
              <span className='ml-2 text-xs text-text-secondary font-normal'>
                {parsedData.length} transactions
              </span>
            </h2>
          </div>

          <div className='bg-bg-card border border-border rounded-xl overflow-hidden'>
            <div className='overflow-x-auto'>
              <div className='max-h-96 overflow-y-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='border-b border-border'>
                      {Object.keys(parsedData[0]).map((key, index) => (
                        <th
                          key={index}
                          className='px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider'
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, index) => (
                      <tr
                        key={index}
                        className='border-b border-border/50 hover:bg-bg-secondary/50 transition-colors'
                      >
                        {Object.values(row).map((value, idx) => (
                          <td
                            key={idx}
                            className='px-4 py-3 text-text-secondary text-xs'
                          >
                            {String(value).length > 30
                              ? String(value).slice(0, 30) + '...'
                              : value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className='px-4 py-3 border-t border-border'>
              <p className='text-text-secondary text-xs'>
                Showing all {parsedData.length} transactions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default page
