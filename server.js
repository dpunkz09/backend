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
  error: null
};

// Fetch cookies immediately on startup
(async () => {
  console.log('Fetching initial cookies...');
  console.log('This may take 30-60 seconds due to Cloudflare protection...');
  try {
    cookieData = await fetchCookies();
    console.log('Initial cookies fetched successfully');
    console.log('Cookie count:', cookieData.cookie.split('; ').length);
  } catch (error) {
    console.error('Failed to fetch initial cookies:', error.message);
    cookieData.error = error.message;
    cookieData.updatedAt = new Date().toISOString();
  }
})();

// Schedule cookie refresh every 6 hours
//cron.schedule('0 */6 * * *', async () => { //schedule cookie refresh every 6hrs
cron.schedule('*/10 * * * *', async () => { //schedule cookie refresh every 10mins
  console.log('Running scheduled cookie fetch...');
  try {
    cookieData = await fetchCookies();
    console.log('Cookies refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh cookies:', error.message);
    cookieData.error = error.message;
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Drama Cookie Fetcher API',
    endpoints: {
      cookies: '/api/cookies',
      refresh: '/api/refresh'
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
      details: 'The service is attempting to fetch cookies. This may take up to 60 seconds.'
    });
  }

  res.json({
    cookie: cookieData.cookie,
    userAgent: cookieData.userAgent,
    updatedAt: cookieData.updatedAt
  });
});

// Manual refresh endpoint
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('Manual cookie refresh requested...');
    cookieData = await fetchCookies();
    res.json({
      success: true,
      cookie: cookieData.cookie,
      userAgent: cookieData.userAgent,
      updatedAt: cookieData.updatedAt
    });
  } catch (error) {
    console.error('Manual refresh failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
