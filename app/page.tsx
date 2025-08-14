"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/metric-card"
import { HousingChart } from "@/components/housing-chart"
import type { HousingData } from "@/lib/types"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HoustonHousingDashboard() {
  const [data, setData] = useState<HousingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/housing-data")
      if (!response.ok) {
        throw new Error("Failed to fetch housing data")
      }
      const housingData = await response.json()
      setData(housingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading housing data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Houston Housing Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time insights into Houston's housing market</p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>

        {/* Main Chart Area */}
        <section className="mb-8">
          <HousingChart
            title="Houston House Price Index Trend"
            data={data.housePriceIndex}
            color="#3b82f6"
            yAxisLabel="Index Value"
          />
        </section>

        {/* Secondary Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <HousingChart
            title="Active Housing Listings"
            data={data.activeListings}
            color="#10b981"
            yAxisLabel="Number of Listings"
          />
          <HousingChart
            title="Building Permits Issued"
            data={data.buildingPermits}
            color="#f59e0b"
            yAxisLabel="Permits"
          />
        </section>

        {/* Economic Indicators */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Economic Indicators</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HousingChart
              title="Rental Consumer Price Index"
              data={data.rentCPI}
              color="#8b5cf6"
              yAxisLabel="CPI Value"
            />
            <HousingChart
              title="Unemployment Rate"
              data={data.unemploymentRate}
              color="#ef4444"
              yAxisLabel="Percentage (%)"
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>Data sourced from Federal Reserve Economic Data (FRED)</p>
            <p className="mt-1">Houston-The Woodlands-Sugar Land Metropolitan Statistical Area</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
