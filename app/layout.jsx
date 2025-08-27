import './globals.css'

export const metadata = {
  title: 'Hello World React App',
  description: 'A simple React web application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
