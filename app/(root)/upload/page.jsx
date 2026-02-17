'use client'

import React from 'react'
import { useState } from 'react'
import Papa from 'papaparse'

const page = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)

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
    }
  }

  return (
    <div>
      <h1>Upload Page</h1>
      <p>Upload your CSV files here!</p>
      <input type='file' onChange={handleFileChange} accept='.csv'/>
    </div>
  )
}

export default page
