# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Houston Housing Dashboard built with Next.js that visualizes housing market data using the FRED (Federal Reserve Economic Data) API. The application provides real-time insights into housing prices, inventory, rental markets, and related economic indicators for the Houston-The Woodlands-Sugar Land metropolitan area.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components built with Radix UI primitives
- **Charts**: Recharts for data visualization
- **Form Handling**: react-hook-form with Zod validation
- **Package Manager**: pnpm

### Project Structure
- `/app` - Next.js App Router pages and API routes
  - `/api/housing-data` - API endpoint for FRED data integration
- `/components` - React components
  - `/ui` - Reusable UI components (buttons, cards, etc.)
  - Core components: `housing-chart.tsx`, `metric-card.tsx`
- `/lib` - Utility functions and shared logic
- `/public` - Static assets
- `/styles` - Global styles and Tailwind configuration

### Key Data Series from FRED API
The application fetches and displays the following data series:
- `ATNHPIUS26420Q` - Houston MSA House Price Index
- `ACTLISCOU26420` - Houston Active Listings
- `HOUS448BPPRIV` - Houston Building Permits
- `CUUSA318SEHA` - Houston Rent CPI
- `HOUS448URN` - Houston Unemployment Rate
- `TXSTHPI` - Texas House Price Index
- `TXRVAC` - Texas Rental Vacancy Rate

### Environment Variables
Create a `.env.local` file with:
```
FRED_API_KEY=your_fred_api_key_here
```

## Development Guidelines

### API Integration Pattern
The FRED API integration is handled through Next.js API routes in `/app/api/housing-data/route.ts`. This provides server-side caching and protects the API key.

### Component Patterns
- Components use TypeScript with proper type definitions
- UI components are built using Radix UI primitives for accessibility
- Charts use Recharts with responsive containers
- Form validation uses Zod schemas with react-hook-form

### Styling Approach
- Tailwind CSS v4 with PostCSS
- Component variants handled by class-variance-authority (CVA)
- Responsive design with mobile-first approach
- Theme support via next-themes

### Path Aliases
The project uses `@/*` path alias that maps to the root directory for cleaner imports.

## Important Notes

- TypeScript and ESLint errors are currently ignored in build (`next.config.mjs`)
- The project is deployed on Vercel and syncs with v0.app
- Currently using dummy data generation in development (see `generateDummyData` function in API route)
- Image optimization is disabled in Next.js config