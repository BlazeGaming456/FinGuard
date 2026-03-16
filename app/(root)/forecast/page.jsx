'use client'

import React from 'react'
import { useState, useEffect } from 'react'

const page = () => {
    const [data, setData] = useState({});
    
    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch ("/api/fetch/forecast?horizon=6")
            setData(await res.json());
        }
        
        fetchData();
    }, [])

    return (
        <div>Page</div>
    )
}

export default page