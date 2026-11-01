# Drama Cookie Fetcher API

Automated cookie fetcher service for dramadunyam.com with a **public dashboard** for easy cookie management.

## 🎯 Features

- **Public Dashboard** - Web UI for easy cookie management at `/`
- **Bookmarklet** - One-click cookie capture from any browser
- Automated cookie fetching using Puppeteer with Stealth plugin
- Advanced Cloudflare bypass (attempts automatic fetch)
- Auto-refresh cookies every 6 hours via cron job
- REST API endpoints for programmatic access
- Ready for Render deployment

## 🚀 Quick Start

1. **Deploy to Render** (see deployment section below)
2. **Visit Quick Capture**: `https://your-app.onrender.com/capture.html`
3. **Wait for page to load** (Cloudflare challenge will complete automatically)
4. **Click "Capture Cookies"** button
5. **Follow the simple steps** to copy and paste cookies
6. **Done!** Cookies are now available via API

## ⚡ Quick Capture Page (Recommended!)

The easiest method for all devices - visit `/capture.html`:

**Simple 4-Step Process:**
1. **Open Page** - Click button to open dramadunyam.com in new tab
2. **Open Console** - Press F12 (or follow mobile instructions)
3. **Copy Cookies** - Paste `document.cookie` in console
4. **Upload** - Paste cookies and click upload

**Features:**
- Clean step-by-step wizard
- Works on desktop AND mobile
- No bookmarklet installation needed
- No iframe issues
- Visual progress indicators
- Automatic redirect to dashboard on success

## 📊 Public Dashboard

Access the dashboard at the root URL: `https://your-app.onrender.com/`

Features:
- Real-time cookie status
- One-click bookmarklet installation
- Quick actions (refresh, test, copy cookies)
- Automatic status updates every 30 seconds

## 🔖 Bookmarklet (Recommended Method)

The easiest way to capture cookies:

1. Visit `https://your-app.onrender.com/bookmarklet.html`
2. Drag the bookmarklet to your bookmarks bar
3. Visit dramadunyam.com and complete Cloudflare challenge
4. Click the bookmarklet
5. Cookies automatically uploaded to your API!

## 📱 Mobile Support

**For Android & iOS users**, visit `https://your-app.onrender.com/mobile.html`

### Mobile Methods:

**Method 1: Copy/Paste (Easiest)**
1. Copy the JavaScript code
2. Visit dramadunyam.com
3. Paste code in browser address bar
4. Press Enter

**Method 2: Mobile Bookmark**
1. Save bookmark with JavaScript code
2. Visit dramadunyam.com
3. Tap bookmark from your bookmarks

**Method 3: Manual Upload**
1. Get cookies from browser
2. Paste in mobile page
3. Click upload

See full mobile instructions at `/mobile.html` on your deployed app.

## API Endpoints

### GET /
Health check and API information

### GET /api/cookies
Returns the current cookies in JSON format:
```json
{
  "cookie": "cookie_string_here",
  "userAgent": "Mozilla/5.0...",
  "updatedAt": "2026-10-24T07:03:56.323Z",
  "source": "manual"
}
```

### POST /api/refresh
Manually trigger an automatic cookie fetch (may fail if Cloudflare blocks Render IPs)

### POST /api/cookies/manual
**Manually update cookies** - Use this if automatic fetching fails:
```json
{
  "cookie": "your_cookie_string_from_browser",
  "userAgent": "optional_user_agent_string"
}
```

See [UPDATE_COOKIES.md](UPDATE_COOKIES.md) for detailed instructions on manually updating cookies.

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

## Important Notes

### Cloudflare Protection

The dramadunyam.com website uses aggressive Cloudflare protection that may block automated access from cloud hosting providers like Render. If automatic cookie fetching fails:

1. **Use Manual Cookie Update** - See [UPDATE_COOKIES.md](UPDATE_COOKIES.md) for step-by-step guide
2. **Run from Your Local Machine** - Cloudflare is less likely to block residential IPs
3. **Set Up Automated Updates** - Use a local cron job or scheduled task to update cookies periodically

### Cookie Expiration

- Cloudflare cookies typically expire after 6-24 hours
- The service tracks cookie source (`auto` or `manual`)
- Failed automatic updates won't overwrite working manual cookies

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
