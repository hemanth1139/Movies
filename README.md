# Watch Log

A Netflix-styled movie and TV series logging web application.

## Features

- **Netflix-inspired UI**: Dark theme with the signature Netflix color palette
- **Hero Billboard**: Full-bleed hero section showcasing your most recently watched content
- **Horizontal Swimlanes**: Browse content by category with smooth carousel navigation
- **Hover Card Expansion**: Detailed metadata revealed on card hover with action buttons
- **Detail Modal**: Lightbox modal for viewing and editing full media details
- **Rating System**: 5-star rating with visual feedback
- **Categories**: Recently Logged, 5-Star Masterpieces, Completed TV Series, Movies Watched This Month, Watchlist

## Design System

- **Primary Background**: #141414 (Netflix Black)
- **Elevated Surface**: #181818 (Deep Charcoal)
- **Secondary Surface**: #2F2F2F
- **Brand Accent**: #E50914 (Netflix Red)
- **Rating/Status**: #46D369 (Netflix Match Green)
- **Typography**: Inter for UI, Bebas Neue for logo

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- CSS-in-JS styling with inline styles

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Component Structure

```
src/
├── components/
│   ├── Navbar.tsx          # Sticky navigation with search
│   ├── HeroBillboard.tsx   # Full-bleed hero section
│   ├── SwimlaneCarousel.tsx # Horizontal content carousels
│   └── DetailModal.tsx     # Lightbox detail modal
├── data/
│   └── mockData.ts         # Sample media data
├── types/
│   └── index.ts            # TypeScript interfaces
├── App.tsx                 # Main application component
├── main.tsx               # Entry point
└── index.css              # Global styles
```

## Usage

The app currently displays mock data. To integrate with a real backend:

1. Replace `mockData.ts` with API calls
2. Add state management (Context API, Redux, etc.)
3. Implement authentication
4. Connect to a database for persistent storage
