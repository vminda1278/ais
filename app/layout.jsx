import './globals.css'

export const metadata = {
  title: 'Income Tax AIS & Equity Data Analyzer',
  description: 'Compare your investment data from Demat accounts and Income Tax AIS statements',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
