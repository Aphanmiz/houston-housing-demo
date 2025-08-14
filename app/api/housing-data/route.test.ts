// @ts-nocheck - Jest globals are available in test environment
import type { HousingData } from '@/lib/types'

// Mock the FRED API module
jest.mock('@/lib/fred-api', () => ({
  fetchAllHousingData: jest.fn()
}))

// Mock NextResponse
const mockJson = jest.fn()
const NextResponse = {
  json: mockJson.mockImplementation((data, options) => ({
    json: async () => data,
    status: options?.status || 200,
    headers: new Map(Object.entries(options?.headers || {}))
  }))
}

// Dynamic import to avoid module resolution issues during testing
async function importRoute() {
  jest.isolateModules(() => {
    jest.doMock('next/server', () => ({ NextResponse }))
  })
  const module = await import('./route')
  return module.GET
}

describe('GET /api/housing-data', () => {
  const mockHousingData: HousingData = {
    metrics: [
      {
        id: 'hpi',
        title: 'House Price Index',
        value: '284.5',
        change: '+5.2%',
        changeType: 'positive',
        description: 'Year-over-year change',
      },
      {
        id: 'inventory',
        title: 'Active Listings',
        value: '12,847',
        change: '-8.1%',
        changeType: 'negative',
        description: 'Month-over-month change',
      },
      {
        id: 'rent',
        title: 'Rental CPI',
        value: '156.8',
        change: '+3.4%',
        changeType: 'positive',
        description: 'Year-over-year change',
      },
      {
        id: 'permits',
        title: 'Building Permits',
        value: '2,341',
        change: '+12.7%',
        changeType: 'positive',
        description: 'Monthly permits issued',
      },
      {
        id: 'unemployment',
        title: 'Unemployment Rate',
        value: '3.8%',
        change: '-0.3%',
        changeType: 'positive',
        description: 'Month-over-month change',
      },
    ],
    housePriceIndex: [
      { date: 'Jan 2024', value: 280.0 },
      { date: 'Feb 2024', value: 284.5 },
    ],
    activeListings: [
      { date: 'Jan 2024', value: 13000 },
      { date: 'Feb 2024', value: 12847 },
    ],
    buildingPermits: [
      { date: 'Jan 2024', value: 2200 },
      { date: 'Feb 2024', value: 2341 },
    ],
    rentCPI: [
      { date: 'Jan 2024', value: 155.0 },
      { date: 'Feb 2024', value: 156.8 },
    ],
    unemploymentRate: [
      { date: 'Jan 2024', value: 4.1 },
      { date: 'Feb 2024', value: 3.8 },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockJson.mockClear()
  })

  it('should return housing data successfully', async () => {
    const fredApi = await import('@/lib/fred-api')
    ;(fredApi.fetchAllHousingData as jest.MockedFunction<typeof fredApi.fetchAllHousingData>)
      .mockResolvedValueOnce(mockHousingData)

    const GET = await importRoute()
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockHousingData)
    expect(fredApi.fetchAllHousingData).toHaveBeenCalledTimes(1)
  })

  it('should handle FRED API errors', async () => {
    const errorMessage = 'FRED API error'
    const fredApi = await import('@/lib/fred-api')
    ;(fredApi.fetchAllHousingData as jest.MockedFunction<typeof fredApi.fetchAllHousingData>)
      .mockRejectedValueOnce(new Error(errorMessage))

    const GET = await importRoute()
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch housing data' })
    expect(fredApi.fetchAllHousingData).toHaveBeenCalledTimes(1)
  })

  it('should handle missing API key error specifically', async () => {
    const fredApi = await import('@/lib/fred-api')
    ;(fredApi.fetchAllHousingData as jest.MockedFunction<typeof fredApi.fetchAllHousingData>)
      .mockRejectedValueOnce(new Error('FRED_API_KEY environment variable is not set'))

    const GET = await importRoute()
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ 
      error: 'Failed to fetch housing data',
      details: 'API key configuration error'
    })
  })

  it('should handle network timeouts', async () => {
    const fredApi = await import('@/lib/fred-api')
    ;(fredApi.fetchAllHousingData as jest.MockedFunction<typeof fredApi.fetchAllHousingData>)
      .mockRejectedValueOnce(new Error('Network timeout'))

    const GET = await importRoute()
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch housing data' })
  })

  it('should validate response data structure', async () => {
    const incompleteData = {
      metrics: [],
      housePriceIndex: [],
      // Missing other required fields
    } as any

    const fredApi = await import('@/lib/fred-api')
    ;(fredApi.fetchAllHousingData as jest.MockedFunction<typeof fredApi.fetchAllHousingData>)
      .mockResolvedValueOnce(incompleteData)

    const GET = await importRoute()
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    // Even with incomplete data, the endpoint should return what it can
    expect(data).toHaveProperty('metrics')
    expect(data).toHaveProperty('housePriceIndex')
  })

  it('should set appropriate cache headers', async () => {
    const fredApi = await import('@/lib/fred-api')
    ;(fredApi.fetchAllHousingData as jest.MockedFunction<typeof fredApi.fetchAllHousingData>)
      .mockResolvedValueOnce(mockHousingData)

    const GET = await importRoute()
    const response = await GET()

    // Check for cache headers
    expect(response.headers.get('Cache-Control')).toBeDefined()
  })
})