# Manual Cookie Update Guide

Since Cloudflare is blocking automated cookie fetching from Render's IP range, you can manually update cookies using this endpoint.

## Method 1: Using Browser DevTools (Recommended)

### Step 1: Get Cookies from Browser

1. Open **Chrome/Edge** (or any Chromium browser)
2. Go to: `https://dramadunyam.com/en/series/scorns-of-the-olympian-blood/episode-1`
3. Wait for Cloudflare challenge to complete
4. Press `F12` to open Developer Tools
5. Go to the **Console** tab
6. Paste this code and press Enter:

```javascript
copy(document.cookie)
```

The cookies are now copied to your clipboard!

### Step 2: Update the API

Send a POST request to your Render API:

**Using curl:**
```bash
curl -X POST https://backend-zbr5.onrender.com/api/cookies/manual \
  -H "Content-Type: application/json" \
  -d '{
    "cookie": "PASTE_YOUR_COOKIES_HERE",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  }'
```

**Using PowerShell:**
```powershell
$body = @{
    cookie = "PASTE_YOUR_COOKIES_HERE"
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://backend-zbr5.onrender.com/api/cookies/manual" -Method Post -Body $body -ContentType "application/json"
```

**Using Postman or Insomnia:**
```
POST https://backend-zbr5.onrender.com/api/cookies/manual
Content-Type: application/json

{
  "cookie": "your_cookie_string_here",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

## Method 2: Using Browser Extension

1. Install **EditThisCookie** or **Cookie-Editor** extension
2. Visit the dramadunyam.com page
3. Click the extension icon
4. Export all cookies as JSON or String
5. Use the exported value in the API request above

## Method 3: Automated Script (For Advanced Users)

Create a local script that runs on your machine (where Cloudflare doesn't block):

```javascript
// local-cookie-fetcher.js
const puppeteer = require('puppeteer');
const axios = require('axios');

async function updateCookies() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://dramadunyam.com/en/series/scorns-of-the-olympian-blood/episode-1');
  await page.waitForTimeout(30000); // Wait for Cloudflare
  
  const cookies = await page.cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  await browser.close();
  
  // Update your Render API
  await axios.post('https://backend-zbr5.onrender.com/api/cookies/manual', {
    cookie: cookieString,
    userAgent: await page.evaluate(() => navigator.userAgent)
  });
  
  console.log('Cookies updated successfully!');
}

updateCookies();
```

Run with: `node local-cookie-fetcher.js`

## Verify Cookies Are Updated

Check the API:
```bash
curl https://backend-zbr5.onrender.com/api/cookies
```

You should see your cookies with `"source": "manual"`.

## How Often to Update?

Cloudflare cookies (especially `cf_clearance`) typically last:
- **6-24 hours** depending on the site's security settings
- Update when you get errors from your app
- Consider setting up a daily automated task using Method 3

## Troubleshooting

**Q: Getting "Missing or invalid cookie string" error?**
A: Make sure the cookie string is properly formatted and enclosed in quotes.

**Q: Cookies expire quickly?**
A: This is normal with Cloudflare. You may need to update them daily or set up automated updates from a non-blocked IP.

**Q: Can I automate this?**
A: Yes! Use Method 3 and run it as a cron job on your local machine or a VPS that isn't blocked by Cloudflare.
