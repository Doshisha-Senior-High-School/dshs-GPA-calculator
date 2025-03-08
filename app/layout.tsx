import type React from "react"
import { Metadata, Viewport } from 'next'
import { Inter } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

const seedFont = localFont({
    src: [
        { path: "../public/LINESeedJP_OTF_Bd.woff", weight: "700", style: "normal" },
        { path: "../public/LINESeedJP_OTF_Rg.woff", weight: "400", style: "normal" },
        { path: "../public/LINESeedJP_OTF_Th.woff", weight: "300", style: "normal" }
    ]
})

export const metadata: Metadata = {
  title: "加重平均計算機",
  description: "同志社高等学校の加重平均計算機",
  generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} ${seedFont.className}`}>{children}</body>
    </html>
  )
}