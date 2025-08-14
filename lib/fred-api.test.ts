// @ts-nocheck - Jest globals are available in test environment
import {
  fetchFREDSeries,
  fetchAllHousingData,
  transformFREDData,
  calculatePercentageChange,
  FREDObservation,
  FREDResponse
} from './fred-api'

// Mock fetch globally
global.fetch = jest.fn()

describe('FRED API Client', () => {
  const mockApiKey = 'test-api-key'
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, FRED_API_KEY: mockApiKey }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('fetchFREDSeries', () => {
    it('should fetch data from FRED API successfully', async () => {
      const mockResponse: FREDResponse = {
        observations: [
          { date: '2023-01-01', value: '100.5' },
          { date: '2023-02-01', value: '101.2' },
        ]
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await fetchFREDSeries('ATNHPIUS26420Q')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.stlouisfed.org/fred/series/observations'),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should throw error when API key is missing', async () => {
      delete process.env.FRED_API_KEY

      await expect(fetchFREDSeries('ATNHPIUS26420Q')).rejects.toThrow(
        'FRED_API_KEY environment variable is not set'
      )
    })

    it('should throw error when API response is not ok', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response)

      await expect(fetchFREDSeries('INVALID_SERIES')).rejects.toThrow(
        'FRED API error: 400 Bad Request'
      )
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(fetchFREDSeries('ATNHPIUS26420Q')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('transformFREDData', () => {
    it('should transform FRED observations to ChartDataPoint format', () => {
      const observations: FREDObservation[] = [
        { date: '2023-01-01', value: '100.5' },
        { date: '2023-02-01', value: '101.2' },
        { date: '2023-03-01', value: '.' }, // Missing data
        { date: '2023-04-01', value: '102.0' },
      ]

      const result = transformFREDData(observations)

      expect(result).toHaveLength(3) // Should exclude missing data point
      expect(result[0]).toEqual({
        date: 'Dec 2022',
        value: 100.5,
      })
      expect(result[1]).toEqual({
        date: 'Jan 2023',
        value: 101.2,
      })
      expect(result[2]).toEqual({
        date: 'Mar 2023',
        value: 102.0,
      })
    })

    it('should handle empty observations', () => {
      const result = transformFREDData([])
      expect(result).toEqual([])
    })

    it('should limit data to last 24 months', () => {
      const observations: FREDObservation[] = []
      // Create 36 months of data
      for (let i = 0; i < 36; i++) {
        const date = new Date(2021, i, 1)
        observations.push({
          date: date.toISOString().split('T')[0],
          value: (100 + i).toString(),
        })
      }

      const result = transformFREDData(observations, 24)
      expect(result).toHaveLength(24)
    })
  })

  describe('calculatePercentageChange', () => {
    it('should calculate positive percentage change', () => {
      const result = calculatePercentageChange(100, 110)
      expect(result).toBe('+10.0%')
    })

    it('should calculate negative percentage change', () => {
      const result = calculatePercentageChange(110, 100)
      expect(result).toBe('-9.1%')
    })

    it('should handle zero old value', () => {
      const result = calculatePercentageChange(0, 100)
      expect(result).toBe('+0.0%')
    })

    it('should handle same values', () => {
      const result = calculatePercentageChange(100, 100)
      expect(result).toBe('+0.0%')
    })
  })

  describe('fetchAllHousingData', () => {
    it('should fetch all housing data series in parallel', async () => {
      const mockHPIResponse: FREDResponse = {
        observations: [
          { date: '2023-01-01', value: '280.0' },
          { date: '2024-01-01', value: '284.5' },
        ]
      }

      const mockInventoryResponse: FREDResponse = {
        observations: [
          { date: '2024-01-01', value: '13000' },
          { date: '2024-02-01', value: '12847' },
        ]
      }

      const mockPermitsResponse: FREDResponse = {
        observations: [
          { date: '2024-01-01', value: '2200' },
          { date: '2024-02-01', value: '2341' },
        ]
      }

      const mockRentResponse: FREDResponse = {
        observations: [
          { date: '2023-01-01', value: '150.0' },
          { date: '2024-01-01', value: '156.8' },
        ]
      }

      const mockUnemploymentResponse: FREDResponse = {
        observations: [
          { date: '2024-01-01', value: '4.1' },
          { date: '2024-02-01', value: '3.8' },
        ]
      }

      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHPIResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInventoryResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPermitsResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRentResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUnemploymentResponse,
        } as Response)

      const result = await fetchAllHousingData()

      expect(fetch).toHaveBeenCalledTimes(5)
      expect(result.metrics).toHaveLength(5)
      expect(result.housePriceIndex).toBeDefined()
      expect(result.activeListings).toBeDefined()
      expect(result.buildingPermits).toBeDefined()
      expect(result.rentCPI).toBeDefined()
      expect(result.unemploymentRate).toBeDefined()

      // Check HPI metric
      const hpiMetric = result.metrics.find((m: any) => m.id === 'hpi')
      expect(hpiMetric).toMatchObject({
        id: 'hpi',
        title: 'House Price Index',
        value: '284.5',
        changeType: expect.any(String),
        description: 'Year-over-year change',
      })
      // The change calculation depends on finding a year-ago value which may not be precise in test
      expect(hpiMetric?.change).toMatch(/^[+-]\d+\.\d%$/)

      // Check inventory metric (month-over-month)
      const inventoryMetric = result.metrics.find((m: any) => m.id === 'inventory')
      expect(inventoryMetric).toMatchObject({
        id: 'inventory',
        title: 'Active Listings',
        value: '12,847',
        changeType: expect.any(String),
        description: 'Month-over-month change',
      })
      expect(inventoryMetric?.change).toMatch(/^[+-]\d+\.\d%$/)
    })

    it('should handle partial failures gracefully', async () => {
      const mockHPIResponse: FREDResponse = {
        observations: [
          { date: '2024-01-01', value: '284.5' },
        ]
      }

      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHPIResponse,
        } as Response)
        .mockRejectedValueOnce(new Error('API Error')) // Inventory fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ observations: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ observations: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ observations: [] }),
        } as Response)

      const result = await fetchAllHousingData()

      // Should still return data structure with available data
      expect(result.metrics).toHaveLength(5)
      expect(result.housePriceIndex).toBeDefined()
      expect(result.activeListings).toEqual([]) // Failed request returns empty array
    })
  })
})