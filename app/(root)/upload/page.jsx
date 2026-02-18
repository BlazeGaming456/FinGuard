'use client'

import React from 'react'
import { useState } from 'react'
import Papa, { parse } from 'papaparse'
import { redirect } from 'next/navigation'

const page = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)

  const saveTransactions = async (transactions) => {
    await fetch('/api/save/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({transactions})
    })
  }

  const handleFileChange = async (e) => {
    //Directly use the file from the event target instead of selectedFile, as it takes time for the state to update and it will not do anything
    const file = e.target.files[0];
    setSelectedFile(file)
    if (file) {
      console.log("In the process")
      Papa.parse(file, {
        header: true,
        complete: results => {
          setParsedData(results.data)
          console.log(results.data)
        }
      })
      saveTransactions(parsedData)
      // redirect('/dashboard')
    }
  }

  return (
    <div>
      <div>
      <h1>Upload Page</h1>
      <p>Upload your CSV files here!</p>
      <input type='file' onChange={handleFileChange} accept='.csv'/>
      </div>
      <div>
        {parsedData && (
          // HTML tag to create tables
          <table>
            <thead>
              {/* Dynamically create table headers based on the keys of the first object in parsedData */}
              <tr>
                {Object.keys(parsedData[0]).map((key, index) => (
                  <th key={index}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.map((row, index) => (
                <tr key={index}>
                  {/* Dynamically create table cells based on the values of each row object */}
                  {Object.values(row).map((value, idx) => (
                    <td key={idx}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default page
