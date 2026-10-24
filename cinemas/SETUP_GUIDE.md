# Setup Guide for CINEMAS

This guide will help you set up CINEMAS with your Neon database and TMDB API.

## Step 1: Get a TMDB API Key

1. Go to https://www.themoviedb.org/
2. Sign up for a free account
3. Go to Settings → API
4. Click "Create" to request an API key
5. Choose "Developer" as the purpose
6. Fill in the form (you can use "Personal project" as the application type)
7. Wait for approval (usually instant)
8. Copy your API key (it starts with "eyJ...")

## Step 2: Set Up Neon

1. Go to https://neon.tech/
2. Sign up for a free account
3. Click "Create a project"
4. Choose a name (e.g., "cinemas") and select a region
5. Click "Create project"
6. Wait for the project to be provisioned (usually instant)

### Create the Database Table

1. In your Neon dashboard, go to the SQL Editor (left sidebar)
2. Click "New Query"
3. Copy the contents of `neon-schema.sql` from this project
4. Paste it into the SQL Editor
5. Click "Run" to execute the SQL
6. You should see "Success" in the results

### Get Your Neon Connection String

1. Go to your project dashboard
2. Click on "Connection Details" (or the database icon)
3. Copy the "Connection string" (it looks like: `postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require`)

## Step 3: Configure Environment Variables

1. In the project root, create a file named `.env`
2. Add the following (replace with your actual values):

```bash
VITE_NEON_DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
VITE_TMDB_API_KEY=your-tmdb-api-key-here
```

3. Save the file

## Step 4: Remove Demo Mode

Currently, the app uses mock data for demonstration. To use your real database:

1. Open `src/lib/database.ts`
2. Remove the import line: `import { mockMovies } from './database.test';`
3. In the `getMovies()` function, remove the mock data check:

```typescript
export async function getMovies(): Promise<Movie[]> {
  try {
    const rows = await sql`
      SELECT * FROM movies
      ORDER BY title ASC
    `;
    return rows as Movie[];
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}
```

4. Remove similar checks from other functions (the `if (!sql)` checks)
5. Delete `src/lib/database.test.ts`

## Step 5: Test the Connection

1. Stop the dev server if it's running (Ctrl+C)
2. Restart it: `npm run dev`
3. Open http://localhost:5173
4. The app should now show an empty collection (since you haven't imported your CSV yet)

## Step 6: Import Your CSV

1. Click the "Import CSV" button
2. Select your `movies.csv` file
3. Review the matches
4. Click "Import" to add titles to your database

The import process will:
- Read your CSV file
- Search TMDB for each title
- Match posters and metadata
- Add titles to your Neon database
- Skip duplicates

## Troubleshooting

### Neon Connection Error

If you see "Neon database URL not found" in the console:
- Check that your `.env` file is in the project root
- Verify the connection string is correct
- Ensure your Neon project is active (not paused)

### TMDB API Error

If posters don't load:
- Check that your TMDB API key is valid
- Verify you haven't exceeded rate limits (40 requests per 10 seconds)
- Check the browser console for specific error messages

### Import Fails

If the import process fails:
- Check that your CSV has the correct headers: "Serial Number,Title,Type,Genre"
- Ensure the CSV is UTF-8 encoded
- Try importing in smaller batches if you have many titles

## Next Steps

After successful setup:

1. Browse your collection using the type and genre filters
2. Use the search bar to find specific titles
3. Click the edit icon on any poster to update genres or change the poster
4. Add new titles using the "Add Title" button
5. Deploy to Vercel or Netlify for online access

## Security Notes

- Never commit your `.env` file to version control
- The Neon connection string contains credentials - keep it private
- Keep your TMDB API key private
- Neon provides serverless PostgreSQL with automatic scaling and backups
