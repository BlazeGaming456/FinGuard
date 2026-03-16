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
    return data
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // remove (INR)
    .replace(/[^a-z0-9 ]/g, "") // remove special chars
    .replace(/\s+/g, " "); // normalize spaces
  }

  const mapHeaders = (headers) => {
    const mappedHeaders = {};

    for (let rawHeader of headers) {
      const normalized = normalizeData(rawHeader);

      for (let key in headerMap) {
        if (headerMap[key].includes(normalized)) {
          mappedHeaders[rawHeader] = key;
        }
      }
    }
    return mappedHeaders;
  }

  const validateHeaders = (mappedHeaders) => {
    if (!mappedHeaders.date || !mappedHeaders.description || !mappedHeaders.amount || !mappedHeaders.type || !mappedHeaders.category) {
      alert("CSV file is missing required headers. Please ensure it includes date, description, amount, type, and category.");
      return false;
    }
    return true;
  }

  const handleFileChange = async (e) => {
    //Directly use the file from the event target instead of selectedFile, as it takes time for the state to update and it will not do anything
    const file = e.target.files[0];
    setSelectedFile(file)
    // File Validation
    if (file.type !== 'text/csv') {
      alert('Invalid file type. Please upload a CSV file.');
      return;
    }
    if (file.size === 0) {
      alert('File is empty. Please upload a non-empty CSV file.');
      return;
    }
    if (file) {
      console.log("In the process")
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true, // Important - skip empty lines to avoid creating empty objects in the parsed data
        complete: async results => {
          const csvHeaders = Object.keys(results.data[0]);
          const mappedHeaders = mapHeaders(csvHeaders);
          if (validateHeaders(mappedHeaders) === false) return; // already alerted in validateHeaders

          const normalizedData = results.data.map(row => {
            const newRow = {};
            for (let key in row) {
              const normalizedKey = mappedHeaders[key] || key;
              newRow[normalizedKey] = row[key];
            }
            newRow.transaction_id = crypto.randomUUID();
            return newRow;
          });

          setParsedData(normalizedData);
          console.log(normalizedData);
          
          console.log('Headers are valid, proceeding to save transactions');
          await saveTransactions(normalizedData);
        }
      })
      
      // redirect('/dashboard')
    }
  }

  return (
    <div>
      <div>
      <h1>Upload Page</h1>
      <p>Upload your CSV files here!</p>
      <p>Support for PDF and XLSX files coming soon!</p>
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
