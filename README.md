# Drama Cookie Fetcher API

Automated cookie fetcher service for dramadunyam.com that can be deployed to Render.

## Features

- Automated cookie fetching using Puppeteer with Stealth plugin
- Advanced Cloudflare bypass using puppeteer-extra-plugin-stealth
- Handles Cloudflare challenges automatically
- Auto-refresh cookies every 6 hours via cron job
- REST API endpoints for accessing cookies
- Ready for Render deployment

## API Endpoints

### GET /
Health check and API information

### GET /api/cookies
Returns the current cookies in JSON format:
```json
{
  "cookie": "cookie_string_here",
  "userAgent": "Mozilla/5.0...",
  "updatedAt": "2026-10-24T07:03:56.323Z"
}
```

### POST /api/refresh
Manually trigger a cookie refresh

## Local Development

1. Install dependencies:
```bash
npm install
```

2. For local testing, you'll need Chromium installed:
   - **Ubuntu/Debian**: `sudo apt-get install chromium-browser`
   - **macOS**: `brew install chromium`
   - **Windows**: Download from [chromium.org](https://www.chromium.org/getting-involved/download-chromium/)

3. Run in development mode:
```bash
npm run dev
```

4. Run in production mode:
```bash
npm start
```

The server will start on port 3000 by default (or PORT environment variable).

## Deploying to Render

### Option 1: Using render.yaml (Recommended)

1. Push this code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file and configure the service
6. Click "Apply" to deploy

**Note**: The service is configured to use Node.js v20 for maximum compatibility.

### Option 2: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: drama-cookie-fetcher
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variable:
   - `NODE_ENV=production`
6. Click "Create Web Service"

### Important Notes for Render

- The service uses `puppeteer-core` with `@sparticuz/chromium` for Render compatibility
- This avoids downloading Chromium during build (much faster deployment)
- The service will automatically restart if it crashes
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep may take 30-60 seconds

## How It Works

1. On startup, the service immediately fetches cookies from dramadunyam.com
2. A cron job runs every 6 hours to refresh the cookies
3. Puppeteer handles browser automation and Cloudflare challenges
4. Cookies are stored in memory and served via the API
5. Manual refresh is available via POST endpoint

## Troubleshooting

If cookies aren't being fetched:
- Check the logs for errors
- The website may have changed its structure
- Cloudflare protection may have been updated
- Try increasing wait times in `cookieFetcher.js`

## Security Notes

- This service doesn't store any personal data
- Cookies are temporary and refreshed automatically
- Use HTTPS when calling the API endpoints
- Consider adding API key authentication for production use
