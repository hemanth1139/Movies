# CINEMAS - Personal Movie & Series Library

A sophisticated personal movie and TV series tracking website with a premium cinematic visual style.

## Features

- **Browse Collection**: View your watched movies and series in a responsive poster grid
- **Search**: Fast, real-time search with partial matching
- **Filter by Type**: All, Movies, TV Series, Anime
- **Filter by Genre**: Horror, Thriller, Mystery, Crime, Romance, Drama, Sci-Fi, Fantasy, Adventure, Comedy, Animation, Superhero, and more
- **Add Titles**: Search and add new movies/series using TMDB API
- **Import CSV**: Import your existing collection from a CSV file with automatic TMDB matching
- **Edit Titles**: Update genres, posters, and metadata for any title
- **Dark Theme**: Elegant charcoal background with gold accents

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Neon** (PostgreSQL) for database storage
- **TMDB API** for poster retrieval and title matching
- **Lucide React** for icons

## Quick Start (Demo Mode)

The app currently runs in demo mode with mock data so you can see the UI immediately:

```bash
cd cinemas
npm install
npm run dev
```

Open http://localhost:5173 in your browser to see the demo with 3 sample movies.

## Full Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Neon account (free tier works)
- A TMDB API key (free at https://www.themoviedb.org/settings/api)

### 2. Set Up Neon

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Go to the SQL Editor in your Neon dashboard
3. Run the SQL from `neon-schema.sql` to create the movies table
4. Go to Project Settings → Connection Details
5. Copy your connection string (it looks like: `postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require`)

### 3. Set Up TMDB

1. Go to [themoviedb.org](https://www.themoviedb.org/settings/api)
2. Request an API key (free)
3. Copy your API key

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_NEON_DATABASE_URL=your_neon_connection_string
VITE_TMDB_API_KEY=your_tmdb_api_key
```

### 5. Remove Demo Mode

After configuring Neon, remove the mock data fallback from `src/lib/database.ts`:

- Delete the import statement for `mockMovies`
- Remove the check `if (!sql)` that returns mock data
- Remove `src/lib/database.test.ts`

### 6. Run the Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## CSV Import Format

Your CSV file should have the following columns:

```
Serial Number,Title,Type,Genre
1,Iron Man,Movie,Superhero
2,The Conjuring,Movie,Horror / Supernatural
3,Naruto,TV Series,Anime
```

- **Serial Number**: Optional identifier
- **Title**: Movie or series name
- **Type**: "Movie" or "TV Series"
- **Genre**: Single genre or multiple separated by "/" (e.g., "Horror / Supernatural")

## Database Schema

The `movies` table stores:

- `id`: UUID (primary key)
- `title`: Text (required)
- `type`: 'Movie' or 'TV Series' (required)
- `genres`: Array of strings (required)
- `franchise`: Text (optional)
- `release_year`: Integer (optional)
- `tmdb_id`: Integer (unique, optional)
- `poster_path`: Text (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Component Structure

```
src/
├── components/
│   ├── Header.tsx           # Logo, search, add button
│   ├── Navigation.tsx      # Type filter tabs
│   ├── GenreFilters.tsx    # Genre filter buttons
│   ├── PosterCard.tsx      # Individual movie poster
│   ├── PosterGrid.tsx      # Responsive grid layout
│   ├── SearchBar.tsx       # Search input with debounce
│   ├── AddTitleModal.tsx   # Add new title from TMDB
│   ├── ImportModal.tsx     # CSV import workflow
│   └── EditModal.tsx       # Edit title details
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── database.ts         # Database operations
│   └── tmdb.ts             # TMDB API integration
├── types/
│   └── movie.ts            # TypeScript types
├── App.tsx                 # Main application
└── main.tsx                # Entry point
```

## Customization

### Colors

Edit `tailwind.config.js` to customize the color palette:

```javascript
theme: {
  extend: {
    colors: {
      background: '#101114',  // Deep charcoal
      surface: '#1B1C21',      // Lighter charcoal
      accent: '#D6A85C',      // Cinematic gold
      primary: '#F5F5F5',      // Off-white text
      secondary: '#A1A1AA',    // Soft gray text
    },
  },
}
```

### Genres

Edit the `GENRES` array in `GenreFilters.tsx`, `AddTitleModal.tsx`, and `EditModal.tsx` to add or remove genre options.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Add environment variables in Netlify dashboard

## Troubleshooting

### Tailwind CSS Errors

If you encounter PostCSS/Tailwind errors, ensure you have the correct versions:
```bash
npm install -D tailwindcss@^3.4.0 postcss autoprefixer
```

### Supabase Connection Issues

The app will fall back to demo mode if Supabase is not configured. Check the browser console for specific error messages.

### TMDB API Issues

Ensure your TMDB API key is valid and has not exceeded rate limits. The app handles API errors gracefully but may not display posters without a valid key.

## TMDB Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

Personal use only.
