import { NextResponse } from "next/server"
import type { HousingData } from "@/lib/types"

// Generate dummy data for the Houston Housing Dashboard
function generateDummyData(): HousingData {
  const currentDate = new Date()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  // Generate historical data points (last 24 months)
  const generateTimeSeries = (baseValue: number, volatility = 0.1) => {
    const data = []
    for (let i = 23; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setMonth(date.getMonth() - i)
      const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`
      const randomChange = (Math.random() - 0.5) * volatility
      const value = baseValue * (1 + randomChange + i * 0.002) // Slight upward trend
      data.push({
        date: monthYear,
        value: Math.round(value * 100) / 100,
      })
    }
    return data
  }

  const metrics = [
    {
      id: "hpi",
      title: "House Price Index",
      value: "284.5",
      change: "+5.2%",
      changeType: "positive" as const,
      description: "Year-over-year change",
    },
    {
      id: "inventory",
      title: "Active Listings",
      value: "12,847",
      change: "-8.1%",
      changeType: "negative" as const,
      description: "Month-over-month change",
    },
    {
      id: "rent",
      title: "Rental CPI",
      value: "156.8",
      change: "+3.4%",
      changeType: "positive" as const,
      description: "Year-over-year change",
    },
    {
      id: "permits",
      title: "Building Permits",
      value: "2,341",
      change: "+12.7%",
      changeType: "positive" as const,
      description: "Monthly permits issued",
    },
    {
      id: "unemployment",
      title: "Unemployment Rate",
      value: "3.8%",
      change: "-0.3%",
      changeType: "positive" as const,
      description: "Month-over-month change",
    },
  ]

  return {
    metrics,
    housePriceIndex: generateTimeSeries(280, 0.08),
    activeListings: generateTimeSeries(13000, 0.15),
    buildingPermits: generateTimeSeries(2200, 0.25),
    rentCPI: generateTimeSeries(155, 0.05),
    unemploymentRate: generateTimeSeries(4.0, 0.2),
  }
}

export async function GET() {
  try {
    const { fetchAllHousingData } = await import('@/lib/fred-api')
    const data = await fetchAllHousingData()
    
    // Add cache headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error fetching housing data:', error)
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('FRED_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch housing data',
          details: 'API key configuration error'
        }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch housing data' }, 
      { status: 500 }
    )
  }
}
