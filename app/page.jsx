"use client"

import { useState } from "react"

export default function CSVAnalyzerPage() {
  const [file, setFile] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [analyzedData, setAnalyzedData] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile && uploadedFile.type === "text/csv") {
      setFile(uploadedFile)
      setError("")
    } else {
      setError("Please upload a valid CSV file")
      setFile(null)
    }
  }

  const parseDate = (dateString) => {
    // Handle DD-MM-YYYY format
    const [day, month, year] = dateString.split('-')
    return new Date(year, month - 1, day)
  }

  const formatDate = (dateString) => {
    // Keep the original format
    return dateString
  }

  const calculateGainType = (purchaseDate, saleDate) => {
    const purchase = parseDate(purchaseDate)
    const sale = parseDate(saleDate)
    
    // Calculate difference in days
    const diffTime = sale.getTime() - purchase.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // If held for more than 365 days (1 year), it's Long Term
    return diffDays > 365 ? "Long Term" : "Short Term"
  }

  const calculateGainAmount = (purchaseAmount, saleAmount) => {
    // Helper function to clean and parse amounts
    const cleanAmount = (amount) => {
      if (!amount) return 0
      
      // Remove currency symbols, quotes, and other non-numeric characters except comma and dot
      let cleaned = String(amount)
        .replace(/[₹$€£¥"']/g, '') // Remove currency symbols and quotes
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
      
      console.log(`💰 Cleaning amount "${amount}" -> "${cleaned}"`)
      
      // Handle different number formats
      if (cleaned.includes(',') && cleaned.includes('.')) {
        // Format: 1,234.56 (comma as thousand separator, dot as decimal)
        cleaned = cleaned.replace(/,/g, '')
      } else if (cleaned.includes(',') && !cleaned.includes('.')) {
        // Could be: 1,234 (thousand separator) or 1,56 (decimal separator)
        // Check if it's likely a decimal (less than 3 digits after comma)
        const afterComma = cleaned.split(',')[1]
        if (afterComma && afterComma.length <= 2) {
          // Likely decimal separator: 1,56 -> 1.56
          cleaned = cleaned.replace(',', '.')
        } else {
          // Likely thousand separator: 1,234 -> 1234
          cleaned = cleaned.replace(/,/g, '')
        }
      }
      
      const parsed = parseFloat(cleaned)
      console.log(`💰 Final parsed amount: ${parsed}`)
      return isNaN(parsed) ? 0 : parsed
    }
    
    const purchase = cleanAmount(purchaseAmount)
    const sale = cleanAmount(saleAmount)
    
    console.log(`💰 Purchase: "${purchaseAmount}" -> ${purchase}`)
    console.log(`💰 Sale: "${saleAmount}" -> ${sale}`)
    
    return (sale - purchase).toFixed(2)
  }

  // Proper CSV parser that handles quoted fields and commas within values
  const parseCSVLine = (line, delimiter) => {
    const result = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handle escaped quotes ("")
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === delimiter && !inQuotes) {
        // Found delimiter outside quotes
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
    
    // Add the last field
    result.push(current.trim())
    
    return result
  }

  const processCSV = async () => {
    if (!file) {
      setError("Please select a file first")
      return
    }

    setIsProcessing(true)
    setError("")
    setDebugInfo("")

    try {
      console.log("📂 Processing file:", file.name, "Size:", file.size, "bytes")
      
      const text = await file.text()
      console.log("📄 File content length:", text.length, "characters")
      console.log("📄 First 500 characters:", text.substring(0, 500))
      
      const lines = text.split('\n').filter(line => line.trim())
      console.log("📋 Total lines after filtering empty:", lines.length)
      console.log("📋 First 3 lines:", lines.slice(0, 3))
      
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header and one data row")
      }

      // Parse header - try different delimiters with proper CSV parsing
      console.log("🔍 Raw header line:", JSON.stringify(lines[0]))
      
      let headers = []
      let delimiter = '\t'
      
      // Try tab delimiter first
      headers = parseCSVLine(lines[0], '\t')
      console.log("📊 Headers with TAB delimiter:", headers, "Count:", headers.length)
      
      // If tab gives only one column, try comma
      if (headers.length === 1) {
        headers = parseCSVLine(lines[0], ',')
        delimiter = ','
        console.log("📊 Headers with COMMA delimiter:", headers, "Count:", headers.length)
      }
      
      // If comma gives only one column, try semicolon
      if (headers.length === 1) {
        headers = parseCSVLine(lines[0], ';')
        delimiter = ';'
        console.log("📊 Headers with SEMICOLON delimiter:", headers, "Count:", headers.length)
      }
      
      console.log("✅ Final detected delimiter:", delimiter)
      console.log("✅ Final headers array:", headers)
      
      // Set debug info for UI
      setDebugInfo(`
📂 File: ${file.name} (${file.size} bytes)
📋 Lines: ${lines.length}
🔧 Delimiter: ${delimiter === '\t' ? 'TAB' : delimiter === ',' ? 'COMMA' : 'SEMICOLON'}
📊 Headers found: ${headers.join(' | ')}
📊 Headers count: ${headers.length}
      `.trim())
      
      const expectedHeaders = ['Purchase Date', 'Sale Date', 'Purchase Amount', 'Sale Amount', 'ISIN']
      console.log("🎯 Expected headers:", expectedHeaders)
      
      // Check each expected header individually
      const missingHeaders = []
      const foundHeaders = []
      
      expectedHeaders.forEach(expectedHeader => {
        const found = headers.find(h => h.toLowerCase().trim() === expectedHeader.toLowerCase().trim())
        if (found) {
          foundHeaders.push({expected: expectedHeader, found: found})
          console.log(`✅ Found header: "${expectedHeader}" matches "${found}"`)
        } else {
          missingHeaders.push(expectedHeader)
          console.log(`❌ Missing header: "${expectedHeader}"`)
          console.log(`   Available headers: ${headers.map(h => `"${h}"`).join(', ')}`)
        }
      })
      
      console.log("📈 Summary - Found:", foundHeaders.length, "Missing:", missingHeaders.length)
      
      // Validate headers
      const hasAllHeaders = missingHeaders.length === 0
      if (!hasAllHeaders) {
        console.error("❌ Header validation failed!")
        console.error("Missing headers:", missingHeaders)
        console.error("Found headers:", headers)
        throw new Error(`CSV must contain these headers: ${expectedHeaders.join(', ')}. 
        Found headers: ${headers.join(', ')}. 
        Missing: ${missingHeaders.join(', ')}`)
      }

      console.log("🔄 Starting data parsing with delimiter:", delimiter)

      // Parse data rows using proper CSV parsing
      const data = []
      for (let i = 1; i < lines.length; i++) {
        console.log(`📝 Processing line ${i}:`, JSON.stringify(lines[i]))
        
        const values = parseCSVLine(lines[i], delimiter)
        console.log(`📝 Line ${i} values:`, values, "Count:", values.length)
        
        if (values.length >= 5) {
          const row = {}
          headers.forEach((header, index) => {
            // Clean up the value by removing surrounding quotes if present
            let cleanValue = values[index] || ''
            if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
              cleanValue = cleanValue.slice(1, -1)
            }
            row[header] = cleanValue
          })
          data.push(row)
          console.log(`✅ Line ${i} parsed:`, row)
        } else {
          console.log(`⚠️ Line ${i} skipped - insufficient columns (${values.length} < 5)`)
        }
      }

      console.log("🎉 Successfully parsed", data.length, "data rows")
      setCsvData(data)

      // Analyze data
      console.log("🧮 Starting data analysis...")
      const analyzed = data.map((row, index) => {
        try {
          console.log(`🧮 Analyzing row ${index + 1}:`, row)
          
          const gainType = calculateGainType(row['Purchase Date'], row['Sale Date'])
          const gainAmount = calculateGainAmount(row['Purchase Amount'], row['Sale Amount'])
          
          const analyzedRow = {
            ...row,
            'Gain Type': gainType,
            'Gain Amount': gainAmount,
            'Holding Period (Days)': Math.ceil((parseDate(row['Sale Date']).getTime() - parseDate(row['Purchase Date']).getTime()) / (1000 * 60 * 60 * 24))
          }
          
          console.log(`✅ Row ${index + 1} analyzed:`, analyzedRow)
          return analyzedRow
        } catch (err) {
          console.error(`❌ Error analyzing row ${index + 1}:`, err.message, row)
          throw new Error(`Error analyzing row ${index + 1}: ${err.message}`)
        }
      })

      console.log("🎊 Analysis complete! Processed", analyzed.length, "rows")
      setAnalyzedData(analyzed)
    } catch (err) {
      console.error("💥 Error processing CSV:", err)
      console.error("💥 Error stack:", err.stack)
      setError(`Error processing file: ${err.message}`)
    } finally {
      setIsProcessing(false)
      console.log("🏁 Processing finished")
    }
  }

  const downloadAnalyzedCSV = () => {
    if (analyzedData.length === 0) return

    // Create CSV content with new headers
    const headers = ['Purchase Date', 'Sale Date', 'Purchase Amount', 'Sale Amount', 'ISIN', 'Gain Type', 'Gain Amount', 'Holding Period (Days)']
    const csvContent = [
      headers.join('\t'),
      ...analyzedData.map(row => 
        headers.map(header => row[header] || '').join('\t')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'analyzed_investment_data.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAggregatedCSV = () => {
    if (analyzedData.length === 0) return

    console.log("🔄 Starting aggregation process...")

    // Group data by ISIN and Gain Type
    const grouped = {}
    
    analyzedData.forEach((row, index) => {
      const key = `${row['ISIN']}_${row['Gain Type']}`
      console.log(`📊 Processing row ${index + 1} for aggregation:`, row)
      
      if (!grouped[key]) {
        grouped[key] = {
          'ISIN': row['ISIN'],
          'Gain Type': row['Gain Type'],
          'Transaction Count': 0,
          'Total Purchase Amount': 0,
          'Total Sale Amount': 0,
          'Total Gain Amount': 0,
          'First Purchase Date': row['Purchase Date'],
          'Last Sale Date': row['Sale Date'],
          'Average Holding Period (Days)': 0
        }
      }
      
      // Parse amounts for aggregation
      const purchaseAmount = parseFloat(row['Purchase Amount'].toString().replace(/[₹$€£¥,"]/g, '')) || 0
      const saleAmount = parseFloat(row['Sale Amount'].toString().replace(/[₹$€£¥,"]/g, '')) || 0
      const gainAmount = parseFloat(row['Gain Amount']) || 0
      const holdingPeriod = parseInt(row['Holding Period (Days)']) || 0
      
      console.log(`💰 Parsed amounts - Purchase: ${purchaseAmount}, Sale: ${saleAmount}, Gain: ${gainAmount}`)
      
      // Aggregate values
      grouped[key]['Transaction Count']++
      grouped[key]['Total Purchase Amount'] += purchaseAmount
      grouped[key]['Total Sale Amount'] += saleAmount
      grouped[key]['Total Gain Amount'] += gainAmount
      
      // Track date ranges
      if (row['Purchase Date'] < grouped[key]['First Purchase Date']) {
        grouped[key]['First Purchase Date'] = row['Purchase Date']
      }
      if (row['Sale Date'] > grouped[key]['Last Sale Date']) {
        grouped[key]['Last Sale Date'] = row['Sale Date']
      }
      
      // Calculate average holding period (we'll divide by count later)
      grouped[key]['Average Holding Period (Days)'] += holdingPeriod
    })

    // Convert to array and calculate averages
    const aggregatedData = Object.values(grouped).map(group => {
      group['Average Holding Period (Days)'] = Math.round(group['Average Holding Period (Days)'] / group['Transaction Count'])
      
      // Format amounts with commas
      group['Total Purchase Amount'] = group['Total Purchase Amount'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      group['Total Sale Amount'] = group['Total Sale Amount'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      group['Total Gain Amount'] = group['Total Gain Amount'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      
      return group
    })

    console.log("📈 Aggregated data:", aggregatedData)

    // Sort by ISIN, then by Gain Type
    aggregatedData.sort((a, b) => {
      if (a['ISIN'] !== b['ISIN']) {
        return a['ISIN'].localeCompare(b['ISIN'])
      }
      return a['Gain Type'].localeCompare(b['Gain Type'])
    })

    // Create CSV content
    const headers = [
      'ISIN', 
      'Gain Type', 
      'Transaction Count', 
      'Total Purchase Amount', 
      'Total Sale Amount', 
      'Total Gain Amount',
      'First Purchase Date',
      'Last Sale Date',
      'Average Holding Period (Days)'
    ]
    
    const csvContent = [
      headers.join('\t'),
      ...aggregatedData.map(row => 
        headers.map(header => row[header] || '').join('\t')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'aggregated_investment_data.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log("✅ Aggregated CSV download completed")
  }

  const reset = () => {
    setFile(null)
    setCsvData([])
    setAnalyzedData([])
    setError("")
    setDebugInfo("")
  }

  const cardStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif"
  }

  const containerStyle = {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    maxWidth: "1000px",
    margin: "0 auto"
  }

  const headerStyle = {
    textAlign: "center",
    marginBottom: "30px"
  }

  const titleStyle = {
    fontSize: "2.5em",
    margin: "0 0 10px 0",
    background: "linear-gradient(135deg, #2e7d32, #1976d2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: "bold"
  }

  const buttonStyle = {
    padding: "12px 24px",
    backgroundColor: "#2e7d32",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    marginRight: "10px",
    marginBottom: "10px"
  }

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#1976d2"
  }

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#d32f2f"
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    fontSize: "14px"
  }

  const thStyle = {
    backgroundColor: "#f5f5f5",
    padding: "12px 8px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontWeight: "600"
  }

  const tdStyle = {
    padding: "10px 8px",
    borderBottom: "1px solid #eee"
  }

  return (
    <div style={cardStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>
            Investment CSV Analyzer
          </h1>
          <p style={{ color: "#666", margin: "0" }}>
            Upload your investment CSV file to analyze Short Term vs Long Term gains
          </p>
        </div>

        {/* File Upload Section */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{
            border: "2px dashed #ddd",
            borderRadius: "12px",
            padding: "30px",
            textAlign: "center",
            backgroundColor: "#fafafa"
          }}>
            <div style={{ marginBottom: "20px" }}>
              <svg width="48" height="48" style={{ color: "#666", marginBottom: "10px" }}>
                <rect width="48" height="48" fill="currentColor" rx="4" opacity="0.1"/>
                <path d="M24 16L32 24H28V32H20V24H16L24 16Z" fill="currentColor"/>
              </svg>
              <p style={{ margin: "10px 0", color: "#666" }}>
                {file ? `Selected: ${file.name}` : "Select CSV file or drag and drop"}
              </p>
            </div>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{
                marginBottom: "15px",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
            
            <div>
              <button 
                onClick={processCSV} 
                disabled={!file || isProcessing}
                style={{
                  ...buttonStyle,
                  opacity: (!file || isProcessing) ? 0.6 : 1,
                  cursor: (!file || isProcessing) ? "not-allowed" : "pointer"
                }}
              >
                {isProcessing ? "Processing..." : "Analyze CSV"} 📊
              </button>
              
              {(csvData.length > 0 || analyzedData.length > 0) && (
                <button onClick={reset} style={dangerButtonStyle}>
                  Reset 🔄
                </button>
              )}
            </div>
          </div>

          {/* Expected Format Info */}
          <div style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#e3f2fd",
            borderRadius: "8px",
            border: "1px solid #bbdefb"
          }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>Expected CSV Format:</h4>
            <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
              <strong>Headers:</strong> Purchase Date | Sale Date | Purchase Amount | Sale Amount | ISIN
            </p>
            <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
              <strong>Date Format:</strong> DD-MM-YYYY (e.g., 05-02-2018)
            </p>
            <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
              <strong>Amount Format:</strong> Numbers with or without commas (e.g., 2,880.37 or 2880.37)
            </p>
            <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
              <strong>Delimiter:</strong> Tab-separated (TSV) or Comma-separated (CSV)
            </p>
            <p style={{ margin: "5px 0", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
              ✨ The app automatically detects delimiters and handles quoted values
            </p>
          </div>
        </div>

        {/* Debug Info Display */}
        {debugInfo && (
          <div style={{
            padding: "15px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "8px",
            marginBottom: "20px",
            fontFamily: "monospace",
            fontSize: "12px",
            whiteSpace: "pre-line",
            color: "#333"
          }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#666", fontFamily: "system-ui" }}>Debug Information:</h4>
            {debugInfo}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            padding: "15px",
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#c62828"
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results Section */}
        {analyzedData.length > 0 && (
          <div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <h3 style={{ margin: "0", color: "#2e7d32" }}>
                Analysis Results ({analyzedData.length} records)
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={downloadAnalyzedCSV} style={secondaryButtonStyle}>
                  Download Detailed CSV 📥
                </button>
                <button onClick={downloadAggregatedCSV} style={{...buttonStyle, backgroundColor: "#9c27b0"}}>
                  Download Aggregated CSV 📊
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              marginBottom: "25px"
            }}>
              <div style={{
                padding: "15px",
                backgroundColor: "#e8f5e8",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2e7d32" }}>
                  {analyzedData.filter(row => row['Gain Type'] === 'Long Term').length}
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>Long Term Gains</div>
              </div>
              <div style={{
                padding: "15px",
                backgroundColor: "#fff3e0",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef6c00" }}>
                  {analyzedData.filter(row => row['Gain Type'] === 'Short Term').length}
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>Short Term Gains</div>
              </div>
              <div style={{
                padding: "15px",
                backgroundColor: "#e3f2fd",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1976d2" }}>
                  ₹{analyzedData.reduce((sum, row) => sum + parseFloat(row['Gain Amount']), 0).toFixed(2)}
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>Total Gains</div>
              </div>
            </div>

            {/* Data Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Purchase Date</th>
                    <th style={thStyle}>Sale Date</th>
                    <th style={thStyle}>Purchase Amount</th>
                    <th style={thStyle}>Sale Amount</th>
                    <th style={thStyle}>ISIN</th>
                    <th style={{...thStyle, backgroundColor: "#e8f5e8"}}>Gain Type</th>
                    <th style={{...thStyle, backgroundColor: "#e8f5e8"}}>Gain Amount</th>
                    <th style={{...thStyle, backgroundColor: "#e8f5e8"}}>Holding Period</th>
                  </tr>
                </thead>
                <tbody>
                  {analyzedData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td style={tdStyle}>{row['Purchase Date']}</td>
                      <td style={tdStyle}>{row['Sale Date']}</td>
                      <td style={tdStyle}>₹{row['Purchase Amount']}</td>
                      <td style={tdStyle}>₹{row['Sale Amount']}</td>
                      <td style={tdStyle}>{row['ISIN']}</td>
                      <td style={{
                        ...tdStyle,
                        fontWeight: "bold",
                        color: row['Gain Type'] === 'Long Term' ? '#2e7d32' : '#ef6c00'
                      }}>
                        {row['Gain Type']}
                      </td>
                      <td style={{
                        ...tdStyle,
                        fontWeight: "bold",
                        color: parseFloat(row['Gain Amount']) >= 0 ? '#2e7d32' : '#d32f2f'
                      }}>
                        ₹{row['Gain Amount']}
                      </td>
                      <td style={tdStyle}>{row['Holding Period (Days)']} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analyzedData.length > 10 && (
                <p style={{ textAlign: "center", color: "#666", marginTop: "15px" }}>
                  Showing first 10 records. Download CSV to see all {analyzedData.length} records.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          paddingTop: "30px",
          borderTop: "1px solid #e0e0e0",
          marginTop: "30px"
        }}>
          <p style={{
            fontSize: "12px",
            color: "#999",
            margin: "0"
          }}>
            Investment CSV Analyzer - Built with React & Next.js 📈
          </p>
        </div>
      </div>
    </div>
  )
}
