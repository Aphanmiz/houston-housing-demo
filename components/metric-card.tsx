import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { HousingMetric } from "@/lib/types"

interface MetricCardProps {
  metric: HousingMetric
}

export function MetricCard({ metric }: MetricCardProps) {
  const getIcon = () => {
    switch (metric.changeType) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getChangeColor = () => {
    switch (metric.changeType) {
      case "positive":
        return "text-green-600"
      case "negative":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
        <div className="flex items-center space-x-1 text-xs">
          <span className={getChangeColor()}>{metric.change}</span>
          <span className="text-gray-500">{metric.description}</span>
        </div>
      </CardContent>
    </Card>
  )
}
