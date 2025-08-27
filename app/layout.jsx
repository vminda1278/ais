import './globals.css'

export const metadata = {
  title: 'Investment Data Analyzer',
  description: 'Analyze your investment data from Demat accounts and AIS statements',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
