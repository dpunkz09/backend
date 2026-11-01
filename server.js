const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { fetchCookies } = require('./cookieFetcher');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Store the latest cookie data
let cookieData = {
  cookie: null,
  userAgent: null,
  updatedAt: null,
  error: null,
  source: null // 'auto' or 'manual'
};

// Fetch cookies immediately on startup
(async () => {
  console.log('Fetching initial cookies...');
  console.log('This may take 30-60 seconds due to Cloudflare protection...');
  try {
    const result = await fetchCookies();
    cookieData = { ...result, source: 'auto' };
    console.log('Initial cookies fetched successfully');
    console.log('Cookie count:', cookieData.cookie.split('; ').length);
  } catch (error) {
    console.error('Failed to fetch initial cookies:', error.message);
    console.log('Note: You can manually update cookies via POST /api/cookies/manual');
    cookieData.error = error.message;
    cookieData.updatedAt = new Date().toISOString();
    cookieData.source = 'failed-auto';
  }
})();

// Schedule cookie refresh every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled cookie fetch...');
  try {
    const result = await fetchCookies();
    cookieData = { ...result, source: 'auto' };
    console.log('Cookies refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh cookies:', error.message);
    // Don't overwrite existing working cookies on auto-refresh failure
    if (!cookieData.cookie) {
      cookieData.error = error.message;
      cookieData.updatedAt = new Date().toISOString();
    }
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Drama Cookie Fetcher API',
    cookiesAvailable: !!cookieData.cookie,
    lastUpdate: cookieData.updatedAt,
    source: cookieData.source,
    endpoints: {
      cookies: 'GET /api/cookies - Get current cookies',
      refresh: 'POST /api/refresh - Trigger automatic fetch',
      manual: 'POST /api/cookies/manual - Manually set cookies'
    }
  });
});

// Get current cookies
app.get('/api/cookies', (req, res) => {
  if (!cookieData.cookie) {
    return res.status(503).json({
      error: 'Cookies not available yet',
      message: cookieData.error || 'Cookie fetch in progress',
      lastAttempt: cookieData.updatedAt,
      details: 'Use POST /api/cookies/manual to manually set cookies, or wait for automatic fetch to complete.'
    });
  }

  res.json({
    cookie: cookieData.cookie,
    userAgent: cookieData.userAgent,
    updatedAt: cookieData.updatedAt,
    source: cookieData.source
  });
});

// Manual refresh endpoint (automatic fetch)
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('Manual cookie refresh requested...');
    const result = await fetchCookies();
    cookieData = { ...result, source: 'auto' };
    res.json({
      success: true,
      cookie: cookieData.cookie,
      userAgent: cookieData.userAgent,
      updatedAt: cookieData.updatedAt,
      source: cookieData.source
    });
  } catch (error) {
    console.error('Manual refresh failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual cookie update endpoint
app.post('/api/cookies/manual', (req, res) => {
  const { cookie, userAgent } = req.body;
  
  if (!cookie || typeof cookie !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid cookie string. Send JSON: { "cookie": "your_cookie_string", "userAgent": "optional_user_agent" }'
    });
  }
  
  const ua = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  
  cookieData = {
    cookie: cookie,
    userAgent: ua,
    updatedAt: new Date().toISOString(),
    error: null,
    source: 'manual'
  };
  
  console.log('Cookies updated manually');
  console.log('Cookie count:', cookie.split('; ').length);
  
  res.json({
    success: true,
    message: 'Cookies updated successfully',
    updatedAt: cookieData.updatedAt,
    cookieCount: cookie.split('; ').length
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
