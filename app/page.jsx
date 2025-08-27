"use client"

import React, { useState } from "react"

export default function InvestmentAnalyzerPage() {
  const [activeTab, setActiveTab] = useState("demat")
  
  // Demat data states
  const [file, setFile] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [analyzedData, setAnalyzedData] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  
  // AIS data states
  const [aisFile, setAisFile] = useState(null)
  const [aisCsvData, setAisCsvData] = useState([])
  const [aisAnalyzedData, setAisAnalyzedData] = useState([])
  const [aisIsProcessing, setAisIsProcessing] = useState(false)
  const [aisError, setAisError] = useState("")
  const [aisDebugInfo, setAisDebugInfo] = useState("")
  
  // Comparison tab states
  const [comparisonDematFile, setComparisonDematFile] = useState(null)
  const [comparisonAisFile, setComparisonAisFile] = useState(null)
  const [comparisonData, setComparisonData] = useState([])
  const [comparisonIsProcessing, setComparisonIsProcessing] = useState(false)
  const [comparisonError, setComparisonError] = useState("")
  const [comparisonDebugInfo, setComparisonDebugInfo] = useState("")
  
  // Company master data state
  const [companyMasterData, setCompanyMasterData] = useState(new Map())
  const [companyMasterLoaded, setCompanyMasterLoaded] = useState(false)

  // Load company master data
  const loadCompanyMasterData = async () => {
    try {
      console.log("🔍 [DEBUG] Loading company master data...")
      const response = await fetch('/config/company_master.csv')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const csvText = await response.text()
      
      const lines = csvText.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        console.warn("❌ [DEBUG] Company master file is empty or has no data")
        return
      }
      
      // Parse header
      const headers = parseCSVLine(lines[0], ',')
      console.log("🔍 [DEBUG] Company Master Headers:", headers)
      
      // Create a map for ISIN lookup: ISIN -> {symbol, name}
      const masterMap = new Map()
      let debugTargetISIN = 'INE139A01034'
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], ',')
        if (values.length >= 3) {
          const symbol = values[0]?.trim()
          const name = values[1]?.trim()
          const isin = values[2]?.trim()
          
          // Debug specific ISIN
          if (isin === debugTargetISIN) {
            console.log(`🎯 [DEBUG] Found target ISIN at line ${i + 1}:`)
            console.log(`🎯 [DEBUG] Raw line: "${lines[i]}"`)
            console.log(`🎯 [DEBUG] Parsed values:`, values)
            console.log(`🎯 [DEBUG] Symbol: "${symbol}"`)
            console.log(`🎯 [DEBUG] Name: "${name}"`)
            console.log(`🎯 [DEBUG] ISIN: "${isin}"`)
          }
          
          if (isin && symbol && name) {
            masterMap.set(isin, { symbol, name })
            
            // Confirm target ISIN was added
            if (isin === debugTargetISIN) {
              console.log(`✅ [DEBUG] Target ISIN added to map successfully`)
            }
          } else if (isin === debugTargetISIN) {
            console.log(`❌ [DEBUG] Target ISIN skipped due to missing data:`)
            console.log(`❌ [DEBUG] ISIN: ${!!isin}, Symbol: ${!!symbol}, Name: ${!!name}`)
          }
        }
      }
      
      console.log(`✅ [DEBUG] Successfully loaded ${masterMap.size} company master records`)
      setCompanyMasterData(masterMap)
      setCompanyMasterLoaded(true)
    } catch (error) {
      console.error("❌ [DEBUG] Error loading company master data:", error)
      setCompanyMasterLoaded(false)
    }
  }

  // Load company master data on component mount
  React.useEffect(() => {
    loadCompanyMasterData()
  }, [])

  const extractISINAndNameFromEquity = (equityField) => {
    console.log(`🔍 [DEBUG] ===== ISIN & NAME EXTRACTION START =====`)
    console.log(`🔍 [DEBUG] Input: ${JSON.stringify(equityField)}`)
    console.log(`🔍 [DEBUG] Company Master Loaded: ${companyMasterLoaded}, Records: ${companyMasterData.size}`)
    
    if (!equityField || typeof equityField !== 'string') {
      console.log("❌ [DEBUG] Invalid equity field")
      return { isin: '', name: '' }
    }
    
    // Extract ISIN using existing logic
    const lastOpenParen = equityField.lastIndexOf('(')
    const lastCloseParen = equityField.lastIndexOf(')')
    
    let isin = ''
    if (lastOpenParen !== -1 && lastCloseParen !== -1 && lastOpenParen < lastCloseParen) {
      const content = equityField.substring(lastOpenParen + 1, lastCloseParen)
      console.log(`🔍 [DEBUG] Content between last parentheses: "${content}"`)
      
      // Check if it looks like an ISIN
      const isISIN = content.length === 12 && content.startsWith('INE')
      
      if (isISIN) {
        isin = content.toUpperCase()
        console.log(`✅ [DEBUG] SUCCESS! Extracted ISIN: "${isin}"`)
      }
    }
    
    // Now look up the company name from master data using ISIN
    let companyName = ''
    if (isin) {
      console.log(`🔍 [DEBUG] Looking up ISIN "${isin}" in master data...`)
      
      if (!companyMasterLoaded) {
        console.log(`⚠️ [DEBUG] Company master data not loaded yet, using fallback`)
      } else if (companyMasterData.has(isin)) {
        const masterRecord = companyMasterData.get(isin)
        companyName = masterRecord.name
        console.log(`✅ [DEBUG] Found company name in master data: "${companyName}"`)
      } else {
        console.log(`⚠️ [DEBUG] ISIN "${isin}" not found in company master data`)
        console.log(`🔍 [DEBUG] Available ISINs sample:`, Array.from(companyMasterData.keys()).slice(0, 5))
      }
      
      // If we don't have a name from master data, use fallback
      if (!companyName) {
        console.log(`🔍 [DEBUG] Using fallback extraction from equity field`)
        
        // Fallback: Extract equity name from field (everything before #, -, EQ, or EQUITY)
        const separators = ['#', ' - ', ' EQ', ' EQUITY', '(']
        let separatorPos = equityField.length
        
        for (const sep of separators) {
          const pos = equityField.indexOf(sep)
          if (pos !== -1 && pos < separatorPos) {
            separatorPos = pos
          }
        }
        
        companyName = equityField.substring(0, separatorPos).trim()
        console.log(`🔍 [DEBUG] Fallback extracted name: "${companyName}"`)
      }
    }
    
    console.log(`🔍 [DEBUG] ===== EXTRACTION END =====`)
    return { isin, name: companyName }
  }

  // Keep the old function for backward compatibility
  const extractISINFromEquity = (equityField) => {
    const result = extractISINAndNameFromEquity(equityField)
    return result.isin
  }

  // Make the function available globally for testing
  if (typeof window !== 'undefined') {
    window.testISIN = (testString) => {
      console.log(`🧪 Manual test with: "${testString}"`);
      const result = extractISINFromEquity(testString);
      console.log(`🧪 Result: "${result}"`);
      return result;
    };
  }

  const testISINExtraction = () => {
    console.log("🧪 Testing ISIN extraction with sample data...")
    
    const testCases = [
      "TATA ELXSI LIMITED EQUITY SHARES(INE670A01012)",
      "INFOSYS LIMITED - EQUITY SHARES OF RS 5/- EACH(INE009A01021)",
      "WAAREE ENERGIES LIMITED # EQUITY SHARES(INE377N01017)",
      "SUZLON ENERGY LIMITED - NEW EQUITY SHARES OF RS. 2/- AFTER SPLIT(INE040H01021)",
      "GAIL (INDIA) LTD [FORMERLY GAS AUTHORITY OF INDIA LTD](INE129A01019)"
    ]
    
    testCases.forEach((testCase, index) => {
      console.log(`\n🧪 Test Case ${index + 1}:`)
      const result = extractISINFromEquity(testCase)
      console.log(`Input: "${testCase}"`)
      console.log(`Output: "${result}"`)
      console.log(`Success: ${result ? '✅' : '❌'}`)
    })
  }

  // Test function for specific ISIN lookup
  const testSpecificISIN = (isin) => {
    console.log(`🧪 Testing specific ISIN: ${isin}`)
    console.log(`🔍 Company Master Loaded: ${companyMasterLoaded}`)
    console.log(`🔍 Company Master Size: ${companyMasterData.size}`)
    
    if (companyMasterData.has(isin)) {
      const record = companyMasterData.get(isin)
      console.log(`✅ Found: ${record.symbol} - ${record.name}`)
      return record
    } else {
      console.log(`❌ Not found in master data`)
      console.log(`🔍 Sample keys:`, Array.from(companyMasterData.keys()).slice(0, 10))
      return null
    }
  }

  // Make test functions available globally
  if (typeof window !== 'undefined') {
    window.testSpecificISIN = testSpecificISIN
  }

  const handleAisFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile && uploadedFile.type === "text/csv") {
      setAisFile(uploadedFile)
      setAisError("")
    } else {
      setAisError("Please upload a valid CSV file")
      setAisFile(null)
    }
  }

  const processAisCSV = async () => {
    if (!aisFile) {
      setAisError("Please select a file first")
      return
    }

    setAisIsProcessing(true)
    setAisError("")
    setAisDebugInfo("")

    try {
      // Wait for company master data to be loaded
      if (!companyMasterLoaded) {
        console.log("⏳ Waiting for company master data to load...")
        setAisDebugInfo("⏳ Loading company master data...")
        
        // Wait up to 10 seconds for company master data to load
        let waitCount = 0
        while (!companyMasterLoaded && waitCount < 100) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
        }
        
        if (!companyMasterLoaded) {
          throw new Error("Company master data failed to load. Please refresh the page and try again.")
        }
        
        console.log("✅ Company master data loaded, proceeding with CSV processing...")
      }
      console.log("📂 Processing AIS file:", aisFile.name, "Size:", aisFile.size, "bytes")
      
      const text = await aisFile.text()
      console.log("📄 AIS File content length:", text.length, "characters")
      console.log("📄 AIS First 500 characters:", text.substring(0, 500))
      
      const lines = text.split('\n').filter(line => line.trim())
      console.log("📋 AIS Total lines after filtering empty:", lines.length)
      console.log("📋 AIS First 3 lines:", lines.slice(0, 3))
      
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header and one data row")
      }

      // Parse header - try different delimiters with proper CSV parsing
      console.log("🔍 AIS Raw header line:", JSON.stringify(lines[0]))
      
      let headers = []
      let delimiter = '\t'
      
      // Try tab delimiter first
      headers = parseCSVLine(lines[0], '\t')
      console.log("📊 AIS Headers with TAB delimiter:", headers, "Count:", headers.length)
      
      // If tab gives only one column, try comma
      if (headers.length === 1) {
        headers = parseCSVLine(lines[0], ',')
        delimiter = ','
        console.log("📊 AIS Headers with COMMA delimiter:", headers, "Count:", headers.length)
      }
      
      // If comma gives only one column, try semicolon
      if (headers.length === 1) {
        headers = parseCSVLine(lines[0], ';')
        delimiter = ';'
        console.log("📊 AIS Headers with SEMICOLON delimiter:", headers, "Count:", headers.length)
      }
      
      console.log("✅ AIS Final detected delimiter:", delimiter)
      console.log("✅ AIS Final headers array:", headers)
      
      const expectedHeaders = ['Date', 'Equity', 'Asset Type', 'Purchase Amount', 'Sale Amount']
      console.log("🎯 AIS Expected headers:", expectedHeaders)
      
      // Check each expected header individually
      const missingHeaders = []
      const foundHeaders = []
      
      expectedHeaders.forEach(expectedHeader => {
        const found = headers.find(h => h.toLowerCase().trim() === expectedHeader.toLowerCase().trim())
        if (found) {
          foundHeaders.push({expected: expectedHeader, found: found})
          console.log(`✅ AIS Found header: "${expectedHeader}" matches "${found}"`)
        } else {
          missingHeaders.push(expectedHeader)
          console.log(`❌ AIS Missing header: "${expectedHeader}"`)
          console.log(`   Available headers: ${headers.map(h => `"${h}"`).join(', ')}`)
        }
      })
      
      console.log("📈 AIS Summary - Found:", foundHeaders.length, "Missing:", missingHeaders.length)
      
      // Validate headers
      const hasAllHeaders = missingHeaders.length === 0
      if (!hasAllHeaders) {
        console.error("❌ AIS Header validation failed!")
        console.error("AIS Missing headers:", missingHeaders)
        console.error("AIS Found headers:", headers)
        throw new Error(`CSV must contain these headers: ${expectedHeaders.join(', ')}. 
        Found headers: ${headers.join(', ')}. 
        Missing: ${missingHeaders.join(', ')}`)
      }

      console.log("🔄 AIS Starting data parsing with delimiter:", delimiter)

      // Parse data rows using proper CSV parsing
      const data = []
      for (let i = 1; i < lines.length; i++) {
        console.log(`📝 AIS Processing line ${i}:`, JSON.stringify(lines[i]))
        
        const values = parseCSVLine(lines[i], delimiter)
        console.log(`📝 AIS Line ${i} values:`, values, "Count:", values.length)
        
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
          
          // Extract ISIN from Equity field and add as the primary ISIN field
          console.log(`🔍 [RAW] Processing row ${i}, raw equity value:`, JSON.stringify(row['Equity']))
          console.log(`🔍 [RAW] Equity field type:`, typeof row['Equity'])
          console.log(`🔍 [RAW] Equity field length:`, row['Equity'] ? row['Equity'].length : 'null')
          
          const extracted = extractISINAndNameFromEquity(row['Equity'])
          row['ISIN'] = extracted.isin
          row['Equity Name'] = extracted.name
          
          console.log(`🔍 Extracted ISIN "${extracted.isin}" and Name "${extracted.name}" from equity "${row['Equity']}"`)
          
          // Add debug info for UI display
          if (!extracted.isin) {
            console.warn(`⚠️ No ISIN extracted from row ${i}: "${row['Equity']}"`)
            console.warn(`⚠️ Row data:`, row)
          }
          
          data.push(row)
          console.log(`✅ AIS Line ${i} parsed:`, row)
        } else {
          console.log(`⚠️ AIS Line ${i} skipped - insufficient columns (${values.length} < 5)`)
        }
      }

      console.log("🎉 AIS Successfully parsed", data.length, "data rows")
      
      // Set debug info for UI
      setAisDebugInfo(`
📂 File: ${aisFile.name} (${aisFile.size} bytes)
📋 Lines: ${lines.length}
🔧 Delimiter: ${delimiter === '\t' ? 'TAB' : delimiter === ',' ? 'COMMA' : 'SEMICOLON'}
📊 Headers found: ${headers.join(' | ')}
📊 Headers count: ${headers.length}
📊 Data rows processed: ${data.length}
🔍 ISIN Extraction Debug:
${data.slice(0, 3).map((row, idx) => 
  `   Row ${idx + 1}: "${row['Equity']}" → ISIN: "${row['ISIN'] || 'FAILED'}"${!row['ISIN'] ? ' ❌' : ' ✅'}`
).join('\n')}
      `.trim())
      
      setAisCsvData(data)

      // Analyze data for AIS (different logic since we have Date, not separate Purchase/Sale dates)
      console.log("🧮 AIS Starting data analysis...")
      const analyzed = data.map((row, index) => {
        try {
          console.log(`🧮 AIS Analyzing row ${index + 1}:`, row)
          
          // For AIS data, use the Asset Type field directly
          const gainType = row['Asset Type'] || 'Short term' // Default if not specified
          const gainAmount = calculateGainAmount(row['Purchase Amount'], row['Sale Amount'])
          
          const analyzedRow = {
            ...row,
            'Gain Amount': gainAmount
          }
          
          console.log(`✅ AIS Row ${index + 1} analyzed:`, analyzedRow)
          return analyzedRow
        } catch (err) {
          console.error(`❌ AIS Error analyzing row ${index + 1}:`, err.message, row)
          throw new Error(`Error analyzing row ${index + 1}: ${err.message}`)
        }
      })

      console.log("🎊 AIS Analysis complete! Processed", analyzed.length, "rows")
      
      // Sort analyzed data: Short Term first, then Long Term
      const sortedAnalyzed = analyzed.sort((a, b) => {
        // Primary sort: Short Term before Long Term
        if (a['Asset Type'] !== b['Asset Type']) {
          return a['Asset Type'] === 'Short term' ? -1 : 1
        }
        // Secondary sort: by ISIN
        if (a['ISIN'] !== b['ISIN']) {
          return a['ISIN'].localeCompare(b['ISIN'])
        }
        // Tertiary sort: by Date (earliest first)
        return new Date(a['Date'].split('-').reverse().join('-')) - 
               new Date(b['Date'].split('-').reverse().join('-'))
      })
      
      console.log("📈 AIS Data sorted: Short Term first, then Long Term")
      setAisAnalyzedData(sortedAnalyzed)
    } catch (err) {
      console.error("💥 AIS Error processing CSV:", err)
      console.error("💥 AIS Error stack:", err.stack)
      setAisError(`Error processing file: ${err.message}`)
    } finally {
      setAisIsProcessing(false)
      console.log("🏁 AIS Processing finished")
    }
  }

  const downloadAisAnalyzedCSV = () => {
    if (aisAnalyzedData.length === 0) return

    // Create CSV content with all headers including extracted ISIN
    const headers = ['Date', 'Equity', 'ISIN', 'Asset Type', 'Purchase Amount', 'Sale Amount', 'Gain Amount']
    const csvContent = [
      headers.join('\t'),
      ...aisAnalyzedData.map(row => 
        headers.map(header => row[header] || '').join('\t')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'analyzed_ais_data.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAisAggregatedCSV = () => {
    if (aisAnalyzedData.length === 0) return

    console.log("🔄 Starting AIS aggregation process...")

    // Group data by ISIN and Asset Type (matching Demat Data logic)
    const grouped = {}
    
    aisAnalyzedData.forEach((row, index) => {
      const key = `${row['ISIN']}_${row['Asset Type']}`
      console.log(`📊 Processing AIS row ${index + 1} for aggregation:`, row)
      
      if (!grouped[key]) {
        grouped[key] = {
          'ISIN': row['ISIN'],
          'Asset Type': row['Asset Type'],
          'Transaction Count': 0,
          'Total Purchase Amount': 0,
          'Total Sale Amount': 0,
          'Total Gain Amount': 0,
          'First Date': row['Date'],
          'Last Date': row['Date'],
          'Average Holding Period (Days)': 0
        }
      }
      
      // Parse amounts for aggregation
      const purchaseAmount = parseFloat(row['Purchase Amount'].toString().replace(/[₹$€£¥,"]/g, '')) || 0
      const saleAmount = parseFloat(row['Sale Amount'].toString().replace(/[₹$€£¥,"]/g, '')) || 0
      const gainAmount = parseFloat(row['Gain Amount']) || 0
      
      console.log(`💰 AIS Parsed amounts - Purchase: ${purchaseAmount}, Sale: ${saleAmount}, Gain: ${gainAmount}`)
      
      // Aggregate values
      grouped[key]['Transaction Count']++
      grouped[key]['Total Purchase Amount'] += purchaseAmount
      grouped[key]['Total Sale Amount'] += saleAmount
      grouped[key]['Total Gain Amount'] += gainAmount
      
      // Track date ranges
      if (row['Date'] < grouped[key]['First Date']) {
        grouped[key]['First Date'] = row['Date']
      }
      if (row['Date'] > grouped[key]['Last Date']) {
        grouped[key]['Last Date'] = row['Date']
      }
      
      // For AIS data, calculate a simple holding period estimate (we'll improve this)
      // Since we only have one date, we'll use a default or calculate from Asset Type
      const estimatedHoldingPeriod = row['Asset Type'] === 'Long term' ? 400 : 100 // Rough estimate
      grouped[key]['Average Holding Period (Days)'] += estimatedHoldingPeriod
    })

    // Convert to array and calculate averages (matching Demat Data format)
    const aggregatedData = Object.values(grouped).map(group => {
      group['Average Holding Period (Days)'] = Math.round(group['Average Holding Period (Days)'] / group['Transaction Count'])
      
      // Format amounts with commas (matching Demat Data format)
      group['Total Purchase Amount'] = group['Total Purchase Amount'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      group['Total Sale Amount'] = group['Total Sale Amount'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      group['Total Gain Amount'] = group['Total Gain Amount'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      
      return group
    })

    console.log("📈 AIS Aggregated data:", aggregatedData)

    // Sort by Asset Type (Short term first), then by ISIN (matching current sort logic)
    aggregatedData.sort((a, b) => {
      // Primary sort: Short term before Long term
      if (a['Asset Type'] !== b['Asset Type']) {
        return a['Asset Type'] === 'Short term' ? -1 : 1
      }
      // Secondary sort: by ISIN
      return a['ISIN'].localeCompare(b['ISIN'])
    })

    // Create CSV content (matching Demat Data headers structure)
    const headers = [
      'ISIN', 
      'Asset Type', 
      'Transaction Count', 
      'Total Purchase Amount', 
      'Total Sale Amount', 
      'Total Gain Amount',
      'First Date',
      'Last Date',
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
    link.setAttribute('download', 'aggregated_ais_data.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log("✅ AIS Aggregated CSV download completed")
  }

  const resetAis = () => {
    setAisFile(null)
    setAisCsvData([])
    setAisAnalyzedData([])
    setAisError("")
    setAisDebugInfo("")
  }

  // Comparison tab functions
  const handleComparisonDematFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile && uploadedFile.type === "text/csv") {
      setComparisonDematFile(uploadedFile)
      setComparisonError("")
    } else {
      setComparisonError("Please upload a valid CSV file for Demat data")
      setComparisonDematFile(null)
    }
  }

  const handleComparisonAisFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile && uploadedFile.type === "text/csv") {
      setComparisonAisFile(uploadedFile)
      setComparisonError("")
    } else {
      setComparisonError("Please upload a valid CSV file for AIS data")
      setComparisonAisFile(null)
    }
  }

  const processComparisonData = async () => {
    if (!comparisonDematFile || !comparisonAisFile) {
      setComparisonError("Please select both Demat and AIS files")
      return
    }

    setComparisonIsProcessing(true)
    setComparisonError("")
    setComparisonDebugInfo("")

    try {
      // Wait for company master data to be loaded
      if (!companyMasterLoaded) {
        console.log("⏳ Waiting for company master data to load...")
        setComparisonDebugInfo("⏳ Loading company master data...")
        
        // Wait up to 10 seconds for company master data to load
        let waitCount = 0
        while (!companyMasterLoaded && waitCount < 100) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
        }
        
        if (!companyMasterLoaded) {
          throw new Error("Company master data failed to load. Please refresh the page and try again.")
        }
        
        console.log("✅ Company master data loaded, proceeding with comparison processing...")
      }

      console.log("🔄 Starting comparison data processing...")

      // Process Demat file (reuse existing logic)
      const dematText = await comparisonDematFile.text()
      const dematLines = dematText.split('\n').filter(line => line.trim())
      const dematHeaders = parseCSVLine(dematLines[0], '\t').length > 1 ? parseCSVLine(dematLines[0], '\t') : parseCSVLine(dematLines[0], ',')
      const dematDelimiter = parseCSVLine(dematLines[0], '\t').length > 1 ? '\t' : ','
      
      const dematData = []
      for (let i = 1; i < dematLines.length; i++) {
        const values = parseCSVLine(dematLines[i], dematDelimiter)
        if (values.length >= 5) {
          const row = {}
          dematHeaders.forEach((header, index) => {
            let cleanValue = values[index] || ''
            if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
              cleanValue = cleanValue.slice(1, -1)
            }
            row[header] = cleanValue
          })
          
          // Calculate gain type and amount for Demat data
          const gainType = calculateGainType(row['Purchase Date'], row['Sale Date'])
          const gainAmount = calculateGainAmount(row['Purchase Amount'], row['Sale Amount'])
          
          // Add company name lookup using ISIN from master data for Demat data
          let equityName = ''
          if (row['ISIN']) {
            console.log(`🔍 [COMPARISON-DEMAT] Looking up company name for ISIN: ${row['ISIN']}`)
            if (companyMasterData.has(row['ISIN'])) {
              const masterRecord = companyMasterData.get(row['ISIN'])
              equityName = masterRecord.name
              console.log(`✅ [COMPARISON-DEMAT] Found company name: ${masterRecord.name}`)
            } else {
              console.log(`⚠️ [COMPARISON-DEMAT] No company name found for ISIN: ${row['ISIN']}`)
            }
          } else {
            console.log(`⚠️ [COMPARISON-DEMAT] No ISIN provided for lookup`)
          }
          
          dematData.push({
            ...row,
            'Source': 'Demat',
            'Equity Name': equityName,
            'Gain Type': gainType,
            'Asset Type': gainType, // Normalize naming
            'Gain Amount': gainAmount,
            'Date': row['Sale Date'] // Use sale date for comparison
          })
        }
      }

      // Process AIS file (reuse existing logic)
      const aisText = await comparisonAisFile.text()
      const aisLines = aisText.split('\n').filter(line => line.trim())
      const aisHeaders = parseCSVLine(aisLines[0], '\t').length > 1 ? parseCSVLine(aisLines[0], '\t') : parseCSVLine(aisLines[0], ',')
      const aisDelimiter = parseCSVLine(aisLines[0], '\t').length > 1 ? '\t' : ','
      
      const aisData = []
      for (let i = 1; i < aisLines.length; i++) {
        const values = parseCSVLine(aisLines[i], aisDelimiter)
        if (values.length >= 5) {
          const row = {}
          aisHeaders.forEach((header, index) => {
            let cleanValue = values[index] || ''
            if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
              cleanValue = cleanValue.slice(1, -1)
            }
            row[header] = cleanValue
          })
          
          // Extract ISIN and equity name, calculate gain
          const extracted = extractISINAndNameFromEquity(row['Equity'])
          const gainAmount = calculateGainAmount(row['Purchase Amount'], row['Sale Amount'])
          
          aisData.push({
            ...row,
            'Source': 'AIS',
            'ISIN': extracted.isin,
            'Equity Name': extracted.name,
            'Gain Type': row['Asset Type'], // Normalize naming
            'Gain Amount': gainAmount
          })
        }
      }

      console.log(`📊 Processed ${dematData.length} Demat records and ${aisData.length} AIS records`)

      // Create comparison analysis
      const comparison = createComparisonAnalysis(dematData, aisData)
      
      setComparisonDebugInfo(`
📂 Demat File: ${comparisonDematFile.name} (${dematData.length} records)
📂 AIS File: ${comparisonAisFile.name} (${aisData.length} records)
📊 Comparison Results: ${comparison.length} unique ISIN/Asset Type combinations
      `.trim())
      
      setComparisonData(comparison)

    } catch (err) {
      console.error("💥 Error processing comparison data:", err)
      setComparisonError(`Error processing files: ${err.message}`)
    } finally {
      setComparisonIsProcessing(false)
    }
  }

  const createComparisonAnalysis = (dematData, aisData) => {
    console.log("🔄 Creating merged comparison analysis...")
    
    // Aggregate both datasets by ISIN and Asset Type
    const aggregated = {}
    
    // Process Demat data
    dematData.forEach(row => {
      if (!row['ISIN']) return // Skip if no ISIN
      
      // Normalize Asset Type for consistent grouping
      const normalizedAssetType = (row['Asset Type'] || '').toLowerCase().includes('short') ? 'Short Term' : 'Long Term'
      const key = `${row['ISIN']}_${normalizedAssetType}`
      
      if (!aggregated[key]) {
        aggregated[key] = {
          'ISIN': row['ISIN'],
          'Equity Name': row['Equity Name'] || '', // Default to empty if not available
          'Asset Type': normalizedAssetType,
          'Demat_Count': 0,
          'Demat_Sale': 0,
          'AIS_Count': 0,
          'AIS_Sale': 0
        }
      }
      
      // Update equity name if we have one and don't already have it
      if (row['Equity Name'] && !aggregated[key]['Equity Name']) {
        aggregated[key]['Equity Name'] = row['Equity Name']
      }
      
      aggregated[key]['Demat_Count']++
      aggregated[key]['Demat_Sale'] += parseFloat(row['Sale Amount'].toString().replace(/[₹$€£¥,"]/g, '')) || 0
    })
    
    // Process AIS data
    aisData.forEach(row => {
      if (!row['ISIN']) return // Skip if no ISIN
      
      // Normalize Asset Type for consistent grouping
      const normalizedAssetType = (row['Asset Type'] || '').toLowerCase().includes('short') ? 'Short Term' : 'Long Term'
      const key = `${row['ISIN']}_${normalizedAssetType}`
      
      if (!aggregated[key]) {
        aggregated[key] = {
          'ISIN': row['ISIN'],
          'Equity Name': row['Equity Name'] || '',
          'Asset Type': normalizedAssetType,
          'Demat_Count': 0,
          'Demat_Sale': 0,
          'AIS_Count': 0,
          'AIS_Sale': 0
        }
      }
      
      // Update equity name if we have one and don't already have it
      if (row['Equity Name'] && !aggregated[key]['Equity Name']) {
        aggregated[key]['Equity Name'] = row['Equity Name']
      }
      
      aggregated[key]['AIS_Count']++
      aggregated[key]['AIS_Sale'] += parseFloat(row['Sale Amount'].toString().replace(/[₹$€£¥,"]/g, '')) || 0
    })
    
    // Convert to array and keep source data separate
    const comparisonArray = Object.values(aggregated).map(item => {
      const saleDiff = item['Demat_Sale'] - item['AIS_Sale']
      
      return {
        'ISIN': item['ISIN'],
        'Equity Name': item['Equity Name'],
        'Asset Type': item['Asset Type'],
        'Demat_Count': item['Demat_Count'],
        'Demat_Sale': item['Demat_Sale'],
        'AIS_Count': item['AIS_Count'],
        'AIS_Sale': item['AIS_Sale'],
        'Sale_Diff': saleDiff
      }
    })
    
    // Sort by Asset Type then ISIN
    comparisonArray.sort((a, b) => {
      if (a['Asset Type'] !== b['Asset Type']) {
        return a['Asset Type'] === 'Short Term' ? -1 : 1
      }
      return a['ISIN'].localeCompare(b['ISIN'])
    })
    
    console.log(`📊 Merged comparison analysis complete: ${comparisonArray.length} unique combinations`)
    console.log("🔍 Sample entries:", comparisonArray.slice(0, 5))
    
    // Check for duplicates
    const duplicateCheck = new Map()
    comparisonArray.forEach(item => {
      const key = `${item.ISIN}_${item['Asset Type']}`
      if (duplicateCheck.has(key)) {
        console.warn(`⚠️ Duplicate found: ${key}`)
      }
      duplicateCheck.set(key, true)
    })
    
    return comparisonArray
  }

  const downloadComparisonCSV = () => {
    if (comparisonData.length === 0) return

    const headers = [
      'ISIN', 'Equity Name', 'Asset Type', 'Demat_Count', 'Demat_Sale', 'AIS_Count', 'AIS_Sale', 'Sale_Diff'
    ]
    
    const csvContent = [
      headers.join('\t'),
      ...comparisonData.map(row => 
        headers.map(header => {
          const value = row[header] || 0
          if (header.includes('Sale') || header === 'Sale_Diff') {
            return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
          return value
        }).join('\t')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'demat_ais_source_data.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetComparison = () => {
    setComparisonDematFile(null)
    setComparisonAisFile(null)
    setComparisonData([])
    setComparisonError("")
    setComparisonDebugInfo("")
  }

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
    try {
      console.log(`🔍 [DATE] Parsing date: "${dateString}"`)
      
      if (!dateString || typeof dateString !== 'string') {
        throw new Error(`Invalid date string: ${dateString}`)
      }
      
      // Clean the date string
      const cleanDate = dateString.trim()
      
      // Try different date formats
      let parsedDate = null
      
      // Handle DD-MM-YYYY format
      if (cleanDate.includes('-')) {
        const parts = cleanDate.split('-')
        if (parts.length === 3) {
          // Try DD-MM-YYYY first
          let [first, second, third] = parts
          parsedDate = new Date(parseInt(third), parseInt(second) - 1, parseInt(first))
          
          // If this results in an invalid date, try MM-DD-YYYY
          if (isNaN(parsedDate.getTime())) {
            console.log(`🔍 [DATE] DD-MM-YYYY failed, trying MM-DD-YYYY`)
            parsedDate = new Date(parseInt(third), parseInt(first) - 1, parseInt(second))
          }
          
          // If still invalid, try YYYY-MM-DD
          if (isNaN(parsedDate.getTime())) {
            console.log(`🔍 [DATE] MM-DD-YYYY failed, trying YYYY-MM-DD`)
            parsedDate = new Date(parseInt(first), parseInt(second) - 1, parseInt(third))
          }
          
          console.log(`🔍 [DATE] Parsed "${cleanDate}" as: ${parsedDate}`)
        }
      }
      
      // Handle DD/MM/YYYY format
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        if (cleanDate.includes('/')) {
          const parts = cleanDate.split('/')
          if (parts.length === 3) {
            // Try DD/MM/YYYY first
            let [first, second, third] = parts
            parsedDate = new Date(parseInt(third), parseInt(second) - 1, parseInt(first))
            
            // If this results in an invalid date, try MM/DD/YYYY
            if (isNaN(parsedDate.getTime())) {
              console.log(`🔍 [DATE] DD/MM/YYYY failed, trying MM/DD/YYYY`)
              parsedDate = new Date(parseInt(third), parseInt(first) - 1, parseInt(second))
            }
            
            console.log(`🔍 [DATE] Parsed "${cleanDate}" as: ${parsedDate}`)
          }
        }
      }
      
      // Try direct Date parsing as fallback
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        parsedDate = new Date(cleanDate)
        console.log(`🔍 [DATE] Fallback parsing "${cleanDate}" as: ${parsedDate}`)
      }
      
      // Final validation
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        throw new Error(`Unable to parse date: ${dateString}`)
      }
      
      console.log(`✅ [DATE] Successfully parsed: ${dateString} -> ${parsedDate}`)
      return parsedDate
    } catch (error) {
      console.error(`❌ [DATE] Error parsing date "${dateString}":`, error.message)
      throw error
    }
  }

  const formatDate = (dateString) => {
    // Keep the original format
    return dateString
  }

  const calculateGainType = (purchaseDate, saleDate) => {
    try {
      const purchase = parseDate(purchaseDate)
      const sale = parseDate(saleDate)
      
      let actualPurchase = purchase
      let actualSale = sale
      
      // Check if dates are swapped
      if (sale.getTime() < purchase.getTime()) {
        console.warn(`⚠️ [GAIN_TYPE] Dates swapped in calculateGainType, correcting...`)
        actualPurchase = sale
        actualSale = purchase
      }
      
      // Calculate difference in days
      const diffTime = actualSale.getTime() - actualPurchase.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      // If held for more than 365 days (1 year), it's Long Term
      return diffDays > 365 ? "Long Term" : "Short Term"
    } catch (error) {
      console.error(`❌ [GAIN_TYPE] Error in calculateGainType:`, error)
      return "Short Term" // Default fallback
    }
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

  // Make all test functions available globally (after all functions are defined)
  if (typeof window !== 'undefined') {
    window.testSpecificISIN = testSpecificISIN
    window.testCompanyMaster = () => {
      console.log("Company Master Data Status:")
      console.log("Loaded:", companyMasterLoaded)
      console.log("Size:", companyMasterData.size)
      console.log("Sample entries:", Array.from(companyMasterData.entries()).slice(0, 5))
    }
    window.testCSVParsing = () => {
      const testLine = "NATIONALUM,National Aluminium Company Limited,INE139A01034"
      console.log("Testing CSV parsing for:", testLine)
      const parsed = parseCSVLine(testLine, ',')
      console.log("Parsed result:", parsed)
      console.log("Values:", {
        symbol: parsed[0]?.trim(),
        name: parsed[1]?.trim(), 
        isin: parsed[2]?.trim()
      })
    }
    window.testExtractISINAndName = (equityField) => {
      console.log("Testing ISIN and Name extraction for:", equityField)
      const result = extractISINAndNameFromEquity(equityField)
      console.log("Result:", result)
      return result
    }
    window.reloadCompanyMaster = () => {
      console.log("🔄 Reloading company master data...")
      loadCompanyMasterData()
    }
    window.testDematISINLookup = (isin) => {
      console.log(`🧪 Testing Demat ISIN lookup for: ${isin}`)
      console.log(`🔍 Company Master Loaded: ${companyMasterLoaded}`)
      console.log(`🔍 Company Master Size: ${companyMasterData.size}`)
      
      if (companyMasterData.has(isin)) {
        const record = companyMasterData.get(isin)
        console.log(`✅ Found: ${record.name}`)
        return record
      } else {
        console.log(`❌ Not found in master data`)
        return null
      }
    }
    window.testComparisonProcessing = () => {
      console.log(`🧪 Testing comparison processing logic...`)
      console.log(`🔍 Company Master Loaded: ${companyMasterLoaded}`)
      console.log(`🔍 Company Master Size: ${companyMasterData.size}`)
      
      // Test with a sample ISIN
      const testISIN = 'INE139A01034'
      console.log(`🧪 Testing with ISIN: ${testISIN}`)
      
      if (companyMasterData.has(testISIN)) {
        const record = companyMasterData.get(testISIN)
        console.log(`✅ Comparison would find: ${record.name}`)
        return record
      } else {
        console.log(`❌ Comparison would not find company name`)
        return null
      }
    }
    window.testHoldingPeriod = (purchaseDate, saleDate) => {
      console.log(`🧪 Testing holding period calculation...`)
      console.log(`Purchase Date: "${purchaseDate}"`)
      console.log(`Sale Date: "${saleDate}"`)
      
      try {
        const purchase = parseDate(purchaseDate)
        const sale = parseDate(saleDate)
        const diffTime = sale.getTime() - purchase.getTime()
        const holdingPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        console.log(`✅ Holding Period: ${holdingPeriod} days`)
        console.log(`Purchase parsed: ${purchase}`)
        console.log(`Sale parsed: ${sale}`)
        console.log(`Difference in ms: ${diffTime}`)
        
        return {
          purchaseDate: purchase,
          saleDate: sale,
          holdingPeriod: holdingPeriod,
          gainType: holdingPeriod > 365 ? 'Long Term' : 'Short Term'
        }
      } catch (error) {
        console.error(`❌ Error:`, error.message)
        return { error: error.message }
      }
    }
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
      // Wait for company master data to be loaded
      if (!companyMasterLoaded) {
        console.log("⏳ Waiting for company master data to load...")
        setDebugInfo("⏳ Loading company master data...")
        
        // Wait up to 10 seconds for company master data to load
        let waitCount = 0
        while (!companyMasterLoaded && waitCount < 100) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
        }
        
        if (!companyMasterLoaded) {
          throw new Error("Company master data failed to load. Please refresh the page and try again.")
        }
        
        console.log("✅ Company master data loaded, proceeding with CSV processing...")
      }

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
          
          // Add company name lookup using ISIN from master data
          if (row['ISIN']) {
            console.log(`🔍 [DEMAT] Looking up company name for ISIN: ${row['ISIN']}`)
            if (companyMasterData.has(row['ISIN'])) {
              const masterRecord = companyMasterData.get(row['ISIN'])
              row['Equity Name'] = masterRecord.name
              console.log(`✅ [DEMAT] Found company name: ${masterRecord.name}`)
            } else {
              row['Equity Name'] = ''
              console.log(`⚠️ [DEMAT] No company name found for ISIN: ${row['ISIN']}`)
            }
          } else {
            row['Equity Name'] = ''
            console.log(`⚠️ [DEMAT] No ISIN provided for lookup`)
          }
          
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
          
          // Calculate holding period with better error handling and smart date handling
          let holdingPeriod = 0
          try {
            const purchaseDate = parseDate(row['Purchase Date'])
            const saleDate = parseDate(row['Sale Date'])
            
            console.log(`🔍 [HOLDING] Raw Purchase: "${row['Purchase Date']}" -> ${purchaseDate}`)
            console.log(`🔍 [HOLDING] Raw Sale: "${row['Sale Date']}" -> ${saleDate}`)
            
            let actualPurchaseDate = purchaseDate
            let actualSaleDate = saleDate
            
            // Check if dates are swapped (sale before purchase)
            if (saleDate.getTime() < purchaseDate.getTime()) {
              console.warn(`⚠️ [HOLDING] Dates appear to be swapped! Sale (${saleDate}) is before Purchase (${purchaseDate})`)
              console.log(`🔄 [HOLDING] Swapping dates for correct calculation`)
              actualPurchaseDate = saleDate
              actualSaleDate = purchaseDate
            }
            
            const diffTime = actualSaleDate.getTime() - actualPurchaseDate.getTime()
            holdingPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            console.log(`🔍 [HOLDING] Final Purchase: ${actualPurchaseDate}`)
            console.log(`🔍 [HOLDING] Final Sale: ${actualSaleDate}`)
            console.log(`🔍 [HOLDING] Difference in days: ${holdingPeriod}`)
            
            // Ensure holding period is positive
            if (holdingPeriod < 0) {
              console.warn(`⚠️ [HOLDING] Still negative holding period: ${holdingPeriod}, setting to 0`)
              holdingPeriod = 0
            }
          } catch (dateError) {
            console.error(`❌ [HOLDING] Error calculating holding period:`, dateError)
            holdingPeriod = 0
          }
          
          const analyzedRow = {
            ...row,
            'Gain Type': gainType,
            'Gain Amount': gainAmount,
            'Holding Period (Days)': holdingPeriod
          }
          
          console.log(`✅ Row ${index + 1} analyzed:`, analyzedRow)
          return analyzedRow
        } catch (err) {
          console.error(`❌ Error analyzing row ${index + 1}:`, err.message, row)
          throw new Error(`Error analyzing row ${index + 1}: ${err.message}`)
        }
      })

      console.log("🎊 Analysis complete! Processed", analyzed.length, "rows")
      
      // Sort analyzed data: Short Term first, then Long Term
      const sortedAnalyzed = analyzed.sort((a, b) => {
        // Primary sort: Short Term before Long Term
        if (a['Gain Type'] !== b['Gain Type']) {
          return a['Gain Type'] === 'Short Term' ? -1 : 1
        }
        // Secondary sort: by ISIN
        if (a['ISIN'] !== b['ISIN']) {
          return a['ISIN'].localeCompare(b['ISIN'])
        }
        // Tertiary sort: by Purchase Date (earliest first)
        return new Date(a['Purchase Date'].split('-').reverse().join('-')) - 
               new Date(b['Purchase Date'].split('-').reverse().join('-'))
      })
      
      console.log("📈 Data sorted: Short Term first, then Long Term")
      setAnalyzedData(sortedAnalyzed)
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

    // Create CSV content with new headers including Equity Name
    const headers = ['Purchase Date', 'Sale Date', 'Purchase Amount', 'Sale Amount', 'ISIN', 'Equity Name', 'Gain Type', 'Gain Amount', 'Holding Period (Days)']
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
          'Equity Name': row['Equity Name'] || '',
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
      
      // Update equity name if we have one and don't already have it
      if (row['Equity Name'] && !grouped[key]['Equity Name']) {
        grouped[key]['Equity Name'] = row['Equity Name']
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

    // Sort by Gain Type (Short Term first), then by ISIN
    aggregatedData.sort((a, b) => {
      // Primary sort: Short Term before Long Term
      if (a['Gain Type'] !== b['Gain Type']) {
        return a['Gain Type'] === 'Short Term' ? -1 : 1
      }
      // Secondary sort: by ISIN
      return a['ISIN'].localeCompare(b['ISIN'])
    })

    // Create CSV content with equity name
    const headers = [
      'ISIN', 
      'Equity Name',
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

  // Tab styling
  const tabContainerStyle = {
    display: "flex",
    borderBottom: "2px solid #e0e0e0",
    marginBottom: "30px",
    backgroundColor: "#f8f9fa"
  }

  const tabStyle = {
    padding: "15px 30px",
    cursor: "pointer",
    border: "none",
    background: "none",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    borderBottom: "3px solid transparent",
    color: "#666"
  }

  const activeTabStyle = {
    ...tabStyle,
    color: "#2e7d32",
    borderBottomColor: "#2e7d32",
    backgroundColor: "white"
  }

  const DematDataTab = () => (
    <div>
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
                  <th style={thStyle}>Company Name</th>
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
                    <td style={tdStyle}>{row['Equity Name'] || 'N/A'}</td>
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
    </div>
  )

  const AISDataTab = () => (
    <div>
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
              {aisFile ? `Selected: ${aisFile.name}` : "Select AIS CSV file or drag and drop"}
            </p>
          </div>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleAisFileUpload}
            style={{
              marginBottom: "15px",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          />
          
          <div>
            <button 
              onClick={processAisCSV} 
              disabled={!aisFile || aisIsProcessing}
              style={{
                ...buttonStyle,
                opacity: (!aisFile || aisIsProcessing) ? 0.6 : 1,
                cursor: (!aisFile || aisIsProcessing) ? "not-allowed" : "pointer"
              }}
            >
              {aisIsProcessing ? "Processing..." : "Analyze AIS CSV"} 📊
            </button>
            
            {(aisCsvData.length > 0 || aisAnalyzedData.length > 0) && (
              <button onClick={resetAis} style={dangerButtonStyle}>
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
          <h4 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>Expected AIS CSV Format:</h4>
          <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
            <strong>Headers:</strong> Date | Equity | Asset Type | Purchase Amount | Sale Amount
          </p>
          <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
            <strong>Date Format:</strong> DD-MM-YYYY (e.g., 13-Jan-2025)
          </p>
          <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
            <strong>Equity Format:</strong> Company Name with ISIN in parentheses (e.g., TATA ELXSI LIMITED EQUITY SHARES(INE670A01012))
          </p>
          <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
            <strong>Amount Format:</strong> Numbers with commas (e.g., 79,629 or 3,79,520)
          </p>
          <p style={{ margin: "5px 0", fontSize: "14px", color: "#333" }}>
            <strong>Asset Type:</strong> Short term | Long term
          </p>
          <p style={{ margin: "5px 0", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
            ✨ The app will extract ISIN from the Equity field and add it as a separate column
          </p>
        </div>
      </div>

      {/* Debug Info Display */}
      {aisDebugInfo && (
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
          {aisDebugInfo}
        </div>
      )}

      {/* Error Display */}
      {aisError && (
        <div style={{
          padding: "15px",
          backgroundColor: "#ffebee",
          border: "1px solid #f44336",
          borderRadius: "8px",
          marginBottom: "20px",
          color: "#c62828"
        }}>
          ⚠️ {aisError}
        </div>
      )}

      {/* Results Section */}
      {aisAnalyzedData.length > 0 && (
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
              AIS Analysis Results ({aisAnalyzedData.length} records)
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={downloadAisAnalyzedCSV} style={secondaryButtonStyle}>
                Download Detailed CSV 📥
              </button>
              <button onClick={downloadAisAggregatedCSV} style={{...buttonStyle, backgroundColor: "#9c27b0"}}>
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
              backgroundColor: "#fff3e0",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef6c00" }}>
                {aisAnalyzedData.filter(row => row['Asset Type'] === 'Short term').length}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Short Term Gains</div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#e8f5e8",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2e7d32" }}>
                {aisAnalyzedData.filter(row => row['Asset Type'] === 'Long term').length}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Long Term Gains</div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#e3f2fd",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1976d2" }}>
                ₹{aisAnalyzedData.reduce((sum, row) => sum + parseFloat(row['Gain Amount']), 0).toFixed(2)}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Total Gains</div>
            </div>
          </div>

          {/* Data Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Equity</th>
                  <th style={{...thStyle, backgroundColor: "#fff3e0"}}>ISIN (Extracted)</th>
                  <th style={thStyle}>Asset Type</th>
                  <th style={thStyle}>Purchase Amount</th>
                  <th style={thStyle}>Sale Amount</th>
                  <th style={{...thStyle, backgroundColor: "#e8f5e8"}}>Gain Amount</th>
                </tr>
              </thead>
              <tbody>
                {aisAnalyzedData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>{row['Date']}</td>
                    <td style={{...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}} title={row['Equity']}>
                      {row['Equity']}
                    </td>
                    <td style={{...tdStyle, backgroundColor: "#fff3e0", fontWeight: "bold"}}>
                      {row['ISIN']}
                    </td>
                    <td style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      color: row['Asset Type'] === 'Long term' ? '#2e7d32' : '#ef6c00'
                    }}>
                      {row['Asset Type']}
                    </td>
                    <td style={tdStyle}>₹{row['Purchase Amount']}</td>
                    <td style={tdStyle}>₹{row['Sale Amount']}</td>
                    <td style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      color: parseFloat(row['Gain Amount']) >= 0 ? '#2e7d32' : '#d32f2f'
                    }}>
                      ₹{row['Gain Amount']}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {aisAnalyzedData.length > 10 && (
              <p style={{ textAlign: "center", color: "#666", marginTop: "15px" }}>
                Showing first 10 records. Download CSV to see all {aisAnalyzedData.length} records.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const ComparisonTab = () => (
    <div>
      {/* File Upload Section */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{
          border: "2px dashed #ddd",
          borderRadius: "12px",
          padding: "30px",
          textAlign: "center",
          backgroundColor: "#fafafa"
        }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Upload Both Files for Comparison</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Demat File Upload */}
            <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#666" }}>📊 Demat Data</h4>
              <input
                type="file"
                accept=".csv"
                onChange={handleComparisonDematFileUpload}
                style={{
                  marginBottom: "10px",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  width: "100%"
                }}
              />
              <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
                {comparisonDematFile ? `✅ ${comparisonDematFile.name}` : "Select Demat CSV file"}
              </p>
            </div>
            
            {/* AIS File Upload */}
            <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#666" }}>📋 AIS Data</h4>
              <input
                type="file"
                accept=".csv"
                onChange={handleComparisonAisFileUpload}
                style={{
                  marginBottom: "10px",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  width: "100%"
                }}
              />
              <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
                {comparisonAisFile ? `✅ ${comparisonAisFile.name}` : "Select AIS CSV file"}
              </p>
            </div>
          </div>
          
          <div>
            <button 
              onClick={processComparisonData} 
              disabled={!comparisonDematFile || !comparisonAisFile || comparisonIsProcessing}
              style={{
                ...buttonStyle,
                backgroundColor: "#4caf50",
                opacity: (!comparisonDematFile || !comparisonAisFile || comparisonIsProcessing) ? 0.6 : 1,
                cursor: (!comparisonDematFile || !comparisonAisFile || comparisonIsProcessing) ? "not-allowed" : "pointer"
              }}
            >
              {comparisonIsProcessing ? "Processing..." : "Compare Data"} 🔍
            </button>
            
            {comparisonData.length > 0 && (
              <button onClick={resetComparison} style={dangerButtonStyle}>
                Reset 🔄
              </button>
            )}
          </div>
        </div>

        {/* Expected Format Info */}
        <div style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
          border: "1px solid #c8e6c9"
        }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#2e7d32" }}>Comparison Features:</h4>
          <ul style={{ margin: "5px 0", fontSize: "14px", color: "#333", paddingLeft: "20px" }}>
            <li>Aggregates both datasets by ISIN and Asset Type (Short term / Long term)</li>
            <li>Shows source data from both Demat and AIS separately</li>
            <li>Displays transaction counts and sale amounts from each source</li>
            <li>Provides downloadable combined dataset with source information</li>
          </ul>
        </div>
      </div>

      {/* Debug Info Display */}
      {comparisonDebugInfo && (
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
          <h4 style={{ margin: "0 0 10px 0", color: "#666", fontFamily: "system-ui" }}>Processing Information:</h4>
          {comparisonDebugInfo}
        </div>
      )}

      {/* Error Display */}
      {comparisonError && (
        <div style={{
          padding: "15px",
          backgroundColor: "#ffebee",
          border: "1px solid #f44336",
          borderRadius: "8px",
          marginBottom: "20px",
          color: "#c62828"
        }}>
          ⚠️ {comparisonError}
        </div>
      )}

      {/* Results Section */}
      {comparisonData.length > 0 && (
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
              Comparison Results ({comparisonData.length} items)
            </h3>
            <button onClick={downloadComparisonCSV} style={{...buttonStyle, backgroundColor: "#4caf50"}}>
              Download Comparison CSV 📥
            </button>
          </div>

          {/* Summary Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
                {comparisonData.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Total Records</div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#fff3e0",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef6c00" }}>
                {comparisonData.filter(row => row['Asset Type'] === 'Short Term' || row['Asset Type'] === 'Short term').length}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Short Term</div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#e3f2fd",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1976d2" }}>
                {comparisonData.filter(row => row['Asset Type'] === 'Long Term' || row['Asset Type'] === 'Long term').length}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Long Term</div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#f3e5f5",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7b1fa2" }}>
                ₹{comparisonData.reduce((sum, row) => sum + (row['Demat_Sale'] || 0) + (row['AIS_Sale'] || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Total Sale Amount</div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#ffebee",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d32f2f" }}>
                ₹{comparisonData.reduce((sum, row) => sum + (row['Sale_Diff'] || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>Total Difference</div>
            </div>
          </div>

          {/* Comparison Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ISIN</th>
                  <th style={thStyle}>Equity Name</th>
                  <th style={thStyle}>Asset Type</th>
                  <th style={{...thStyle, backgroundColor: "#e8f5e8"}}>Demat Count</th>
                  <th style={{...thStyle, backgroundColor: "#e8f5e8"}}>Demat Sale (₹)</th>
                  <th style={{...thStyle, backgroundColor: "#fff3e0"}}>AIS Count</th>
                  <th style={{...thStyle, backgroundColor: "#fff3e0"}}>AIS Sale (₹)</th>
                  <th style={{...thStyle, backgroundColor: "#ffebee"}}>Difference (₹)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.slice(0, 15).map((row, index) => (
                  <tr key={index} style={{
                    backgroundColor: '#f8fff8' // Light green for all merged records
                  }}>
                    <td style={tdStyle}>{row['ISIN']}</td>
                    <td style={{...tdStyle, fontWeight: "bold", color: "#1976d2"}}>{row['Equity Name']}</td>
                    <td style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      color: row['Asset Type'] === 'Long Term' || row['Asset Type'] === 'Long term' ? '#2e7d32' : '#ef6c00'
                    }}>
                      {row['Asset Type']}
                    </td>
                    <td style={tdStyle}>{row['Demat_Count']}</td>
                    <td style={tdStyle}>₹{row['Demat_Sale'].toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={tdStyle}>{row['AIS_Count']}</td>
                    <td style={tdStyle}>₹{row['AIS_Sale'].toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      color: Math.abs(row['Sale_Diff']) < 0.01 ? '#2e7d32' : 
                             row['Sale_Diff'] > 0 ? '#d32f2f' : '#1976d2'
                    }}>
                      ₹{row['Sale_Diff'].toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {/* Summary Row */}
                <tr style={{
                  backgroundColor: '#e3f2fd',
                  borderTop: '2px solid #1976d2',
                  fontWeight: 'bold'
                }}>
                  <td style={{...tdStyle, fontWeight: "bold"}}>TOTAL</td>
                  <td style={{...tdStyle, fontWeight: "bold"}}>-</td>
                  <td style={{...tdStyle, fontWeight: "bold"}}>-</td>
                  <td style={{...tdStyle, fontWeight: "bold"}}>
                    {comparisonData.reduce((sum, row) => sum + (row['Demat_Count'] || 0), 0)}
                  </td>
                  <td style={{...tdStyle, fontWeight: "bold"}}>
                    ₹{comparisonData.reduce((sum, row) => sum + (row['Demat_Sale'] || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{...tdStyle, fontWeight: "bold"}}>
                    {comparisonData.reduce((sum, row) => sum + (row['AIS_Count'] || 0), 0)}
                  </td>
                  <td style={{...tdStyle, fontWeight: "bold"}}>
                    ₹{comparisonData.reduce((sum, row) => sum + (row['AIS_Sale'] || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{
                    ...tdStyle,
                    fontWeight: "bold",
                    color: '#1976d2'
                  }}>
                    ₹{comparisonData.reduce((sum, row) => sum + (row['Sale_Diff'] || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
            {comparisonData.length > 15 && (
              <p style={{ textAlign: "center", color: "#666", marginTop: "15px" }}>
                Showing first 15 records. Download CSV to see all {comparisonData.length} records.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

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
            Investment Data Analyzer
          </h1>
          <p style={{ color: "#666", margin: "0" }}>
            Analyze your investment data from Demat accounts and AIS statements
          </p>
          
          {/* Company Master Status */}
          <div style={{
            marginTop: "10px",
            padding: "8px 12px",
            backgroundColor: companyMasterLoaded ? "#d4edda" : "#fff3cd",
            border: `1px solid ${companyMasterLoaded ? "#c3e6cb" : "#ffeaa7"}`,
            borderRadius: "4px",
            fontSize: "12px",
            color: companyMasterLoaded ? "#155724" : "#856404"
          }}>
            {companyMasterLoaded 
              ? `✅ Company Master Data Loaded (${companyMasterData.size} companies)`
              : "⏳ Loading company master data..."
            }
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button
            style={activeTab === "demat" ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab("demat")}
          >
            📊 Demat Data
          </button>
          <button
            style={activeTab === "ais" ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab("ais")}
          >
            📋 AIS Data
          </button>
          <button
            style={activeTab === "comparison" ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab("comparison")}
          >
            🔍 Comparison
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "demat" && <DematDataTab />}
        {activeTab === "ais" && <AISDataTab />}
        {activeTab === "comparison" && <ComparisonTab />}

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
            Investment Data Analyzer - Built with React & Next.js 📈
          </p>
        </div>
      </div>
    </div>
  )
}
