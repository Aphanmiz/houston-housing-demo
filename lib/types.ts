export interface HousingMetric {
  id: string
  title: string
  value: string
  change: string
  changeType: "positive" | "negative" | "neutral"
  description: string
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface HousingData {
  metrics: HousingMetric[]
  housePriceIndex: ChartDataPoint[]
  activeListings: ChartDataPoint[]
  buildingPermits: ChartDataPoint[]
  rentCPI: ChartDataPoint[]
  unemploymentRate: ChartDataPoint[]
}
