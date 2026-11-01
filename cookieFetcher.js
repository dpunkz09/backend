const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const TARGET_URL = 'https://dramadunyam.com/en/series/scorns-of-the-olympian-blood/episode-1';

async function fetchCookies() {
  let browser;
  
  try {
    console.log('Launching browser...');
    
    // Determine if we're in production (Render) or development
    const isProduction = process.env.NODE_ENV === 'production';
    
    const browserConfig = isProduction ? {
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    } : {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-blink-features=AutomationControlled'
      ]
    };

    browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    
    // Hide automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Add chrome object
      window.chrome = {
        runtime: {}
      };
      
      // Permissions API
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    
    // Navigate to the page
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait a bit for initial page load
    await page.waitForTimeout(3000);

    // Check for Cloudflare challenge and wait for it to complete
    let challengeDetected = false;
    for (let i = 0; i < 30; i++) {
      const content = await page.content();
      const title = await page.title();
      
      // Check if we're still on Cloudflare challenge
      if (content.includes('challenge-platform') || 
          content.includes('cf-challenge') || 
          content.includes('checking your browser') ||
          title.includes('Just a moment')) {
        if (!challengeDetected) {
          console.log('Cloudflare challenge detected, waiting...');
          challengeDetected = true;
        }
        await page.waitForTimeout(2000);
      } else {
        // Challenge completed
        if (challengeDetected) {
          console.log('Cloudflare challenge passed!');
        }
        break;
      }
      
      if (i === 29) {
        throw new Error('Cloudflare challenge timeout - could not pass verification');
      }
    }

    // Wait for network to be idle after challenge
    await page.waitForTimeout(5000);

    // Additional wait for cookies to be set
    console.log('Waiting for cookies to be set...');
    await page.waitForTimeout(3000);

    // Get all cookies
    const cookies = await page.cookies();
    
    if (cookies.length === 0) {
      throw new Error('No cookies were set by the website');
    }

    console.log(`Fetched ${cookies.length} cookies`);
    
    // Check for required cookies (especially cf_clearance)
    const hasCfClearance = cookies.some(c => c.name === 'cf_clearance');
    console.log(`cf_clearance cookie present: ${hasCfClearance}`);

    // Format cookies as a single string (like browser format)
    const cookieString = cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const result = {
      cookie: cookieString,
      userAgent: userAgent,
      updatedAt: new Date().toISOString(),
      error: null
    };

    console.log('Cookies fetched successfully');
    return result;

  } catch (error) {
    console.error('Error fetching cookies:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

module.exports = { fetchCookies };
