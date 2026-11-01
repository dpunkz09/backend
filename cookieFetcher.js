const puppeteer = require('puppeteer');

const TARGET_URL = 'https://dramadunyam.com/en/series/scorns-of-the-olympian-blood/episode-1';

async function fetchCookies() {
  let browser;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    });

    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    
    // Navigate to the page and wait for network to be idle
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait a bit more for any delayed cookie setting
    await page.waitForTimeout(5000);

    // Check for Cloudflare challenge
    const content = await page.content();
    if (content.includes('challenge-platform') || content.includes('cf-challenge')) {
      console.log('Cloudflare challenge detected, waiting...');
      // Wait up to 30 seconds for the challenge to complete
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
        console.log('Navigation timeout, but continuing...');
      });
      await page.waitForTimeout(3000);
    }

    // Get all cookies
    const cookies = await page.cookies();
    
    if (cookies.length === 0) {
      throw new Error('No cookies were set by the website');
    }

    console.log(`Fetched ${cookies.length} cookies`);

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
