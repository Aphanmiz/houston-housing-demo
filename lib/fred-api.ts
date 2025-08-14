import type { HousingData, HousingMetric, ChartDataPoint } from '@/lib/types'

export interface FREDObservation {
  date: string
  value: string
}

export interface FREDResponse {
  observations: FREDObservation[]
}

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations'

// FRED series IDs for Houston housing data
const SERIES_IDS = {
  housePriceIndex: 'ATNHPIUS26420Q',    // Houston MSA House Price Index (Quarterly)
  activeListings: 'ACTLISCOU26420',     // Houston Active Listings
  buildingPermits: 'HOUS448BPPRIV',     // Houston Building Permits
  rentCPI: 'CUUSA318SEHA',              // Houston Rent CPI
  unemploymentRate: 'HOUS448URN',       // Houston Unemployment Rate
}

/**
 * Fetch data from FRED API for a specific series
 */
export async function fetchFREDSeries(
  seriesId: string, 
  limit?: number // Make limit optional to allow fetching all data
): Promise<FREDResponse> {
  const apiKey = process.env.FRED_API_KEY
  
  if (!apiKey) {
    throw new Error('FRED_API_KEY environment variable is not set')
  }

  // Build params - if no limit, fetch all available data
  const params: Record<string, string> = {
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'asc',
    units: 'lin', // Linear units (no transformation)
  }

  // Only add date range if limit is specified
  if (limit) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - limit)
    params.observation_start = startDate.toISOString().split('T')[0]
    params.observation_end = endDate.toISOString().split('T')[0]
  }
  // If no limit, FRED API will return all available data

  const url = `${FRED_BASE_URL}?${new URLSearchParams(params).toString()}`

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching FRED series ${seriesId}:`, error)
    throw error
  }
}

/**
 * Transform FRED observations to ChartDataPoint format
 */
export function transformFREDData(
  observations: FREDObservation[], 
  limit?: number // Make limit optional to allow returning all data
): ChartDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  // Filter out missing data
  const validObservations = observations.filter(obs => obs.value !== '.' && obs.value !== '')
  
  // If limit is specified, get last N data points; otherwise return all
  const dataToTransform = limit ? validObservations.slice(-limit) : validObservations
  
  return dataToTransform.map(obs => {
    const date = new Date(obs.date)
    const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`
    return {
      date: monthYear,
      value: parseFloat(obs.value),
    }
  })
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): string {
  if (oldValue === 0) return '+0.0%'
  
  const change = ((newValue - oldValue) / oldValue) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * Format number with thousands separator
 */
function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/**
 * Get the latest valid observation from a series
 */
function getLatestValue(observations: FREDObservation[]): number | null {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].value !== '.' && observations[i].value !== '') {
      return parseFloat(observations[i].value)
    }
  }
  return null
}

/**
 * Get year-over-year change
 */
function getYearOverYearChange(observations: FREDObservation[]): string {
  const latest = getLatestValue(observations)
  if (!latest) return '+0.0%'
  
  // Find value from ~12 months ago
  const targetDate = new Date()
  targetDate.setFullYear(targetDate.getFullYear() - 1)
  
  let yearAgoValue: number | null = null
  for (const obs of observations) {
    if (obs.value !== '.' && obs.value !== '') {
      const obsDate = new Date(obs.date)
      if (Math.abs(obsDate.getTime() - targetDate.getTime()) < 45 * 24 * 60 * 60 * 1000) {
        yearAgoValue = parseFloat(obs.value)
        break
      }
    }
  }
  
  if (!yearAgoValue) return '+0.0%'
  return calculatePercentageChange(yearAgoValue, latest)
}

/**
 * Get month-over-month change
 */
function getMonthOverMonthChange(observations: FREDObservation[]): string {
  const validObs = observations.filter(obs => obs.value !== '.' && obs.value !== '')
  if (validObs.length < 2) return '+0.0%'
  
  const latest = parseFloat(validObs[validObs.length - 1].value)
  const previous = parseFloat(validObs[validObs.length - 2].value)
  
  return calculatePercentageChange(previous, latest)
}

/**
 * Determine change type based on the metric
 */
function getChangeType(change: string, metricId: string): 'positive' | 'negative' | 'neutral' {
  const value = parseFloat(change)
  
  if (value === 0) return 'neutral'
  
  // For unemployment, lower is better
  if (metricId === 'unemployment') {
    return value < 0 ? 'positive' : 'negative'
  }
  
  // For inventory, depends on market perspective
  // Lower inventory might be negative for buyers but positive for sellers
  // We'll treat lower inventory as negative (buyer perspective)
  if (metricId === 'inventory') {
    return value > 0 ? 'positive' : 'negative'
  }
  
  // For most metrics, higher is better
  return value > 0 ? 'positive' : 'negative'
}

/**
 * Fetch all housing data from FRED API
 */
export async function fetchAllHousingData(): Promise<HousingData> {
  try {
    // Fetch all series in parallel - no limit to get all historical data
    const [hpiData, inventoryData, permitsData, rentData, unemploymentData] = await Promise.allSettled([
      fetchFREDSeries(SERIES_IDS.housePriceIndex), // Get all available data
      fetchFREDSeries(SERIES_IDS.activeListings),
      fetchFREDSeries(SERIES_IDS.buildingPermits),
      fetchFREDSeries(SERIES_IDS.rentCPI),
      fetchFREDSeries(SERIES_IDS.unemploymentRate),
    ])

    // Process HPI data
    const hpiObs = hpiData.status === 'fulfilled' ? hpiData.value.observations : []
    const hpiLatest = getLatestValue(hpiObs)
    const hpiChange = getYearOverYearChange(hpiObs)
    
    // Process inventory data
    const inventoryObs = inventoryData.status === 'fulfilled' ? inventoryData.value.observations : []
    const inventoryLatest = getLatestValue(inventoryObs)
    const inventoryChange = getMonthOverMonthChange(inventoryObs)
    
    // Process permits data
    const permitsObs = permitsData.status === 'fulfilled' ? permitsData.value.observations : []
    const permitsLatest = getLatestValue(permitsObs)
    const permitsChange = getMonthOverMonthChange(permitsObs)
    
    // Process rent CPI data
    const rentObs = rentData.status === 'fulfilled' ? rentData.value.observations : []
    const rentLatest = getLatestValue(rentObs)
    const rentChange = getYearOverYearChange(rentObs)
    
    // Process unemployment data
    const unemploymentObs = unemploymentData.status === 'fulfilled' ? unemploymentData.value.observations : []
    const unemploymentLatest = getLatestValue(unemploymentObs)
    const unemploymentChange = getMonthOverMonthChange(unemploymentObs)

    // Create metrics array
    const metrics: HousingMetric[] = [
      {
        id: 'hpi',
        title: 'House Price Index',
        value: hpiLatest ? hpiLatest.toFixed(1) : 'N/A',
        change: hpiChange,
        changeType: getChangeType(hpiChange, 'hpi'),
        description: 'Year-over-year change',
      },
      {
        id: 'inventory',
        title: 'Active Listings',
        value: inventoryLatest ? formatNumber(Math.round(inventoryLatest)) : 'N/A',
        change: inventoryChange,
        changeType: getChangeType(inventoryChange, 'inventory'),
        description: 'Month-over-month change',
      },
      {
        id: 'rent',
        title: 'Rental CPI',
        value: rentLatest ? rentLatest.toFixed(1) : 'N/A',
        change: rentChange,
        changeType: getChangeType(rentChange, 'rent'),
        description: 'Year-over-year change',
      },
      {
        id: 'permits',
        title: 'Building Permits',
        value: permitsLatest ? formatNumber(Math.round(permitsLatest)) : 'N/A',
        change: permitsChange,
        changeType: getChangeType(permitsChange, 'permits'),
        description: 'Monthly permits issued',
      },
      {
        id: 'unemployment',
        title: 'Unemployment Rate',
        value: unemploymentLatest ? `${unemploymentLatest.toFixed(1)}%` : 'N/A',
        change: unemploymentChange,
        changeType: getChangeType(unemploymentChange, 'unemployment'),
        description: 'Month-over-month change',
      },
    ]

    // Transform time series data - return all historical data
    return {
      metrics,
      housePriceIndex: transformFREDData(hpiObs), // No limit - all data
      activeListings: transformFREDData(inventoryObs),
      buildingPermits: transformFREDData(permitsObs),
      rentCPI: transformFREDData(rentObs),
      unemploymentRate: transformFREDData(unemploymentObs),
    }
  } catch (error) {
    console.error('Error fetching housing data:', error)
    // Return empty data structure on error
    return {
      metrics: [
        {
          id: 'hpi',
          title: 'House Price Index',
          value: 'N/A',
          change: '+0.0%',
          changeType: 'neutral',
          description: 'Year-over-year change',
        },
        {
          id: 'inventory',
          title: 'Active Listings',
          value: 'N/A',
          change: '+0.0%',
          changeType: 'neutral',
          description: 'Month-over-month change',
        },
        {
          id: 'rent',
          title: 'Rental CPI',
          value: 'N/A',
          change: '+0.0%',
          changeType: 'neutral',
          description: 'Year-over-year change',
        },
        {
          id: 'permits',
          title: 'Building Permits',
          value: 'N/A',
          change: '+0.0%',
          changeType: 'neutral',
          description: 'Monthly permits issued',
        },
        {
          id: 'unemployment',
          title: 'Unemployment Rate',
          value: 'N/A',
          change: '+0.0%',
          changeType: 'neutral',
          description: 'Month-over-month change',
        },
      ],
      housePriceIndex: [],
      activeListings: [],
      buildingPermits: [],
      rentCPI: [],
      unemploymentRate: [],
    }
  }
}