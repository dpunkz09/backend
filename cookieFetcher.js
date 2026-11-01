const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');

// Add stealth plugin to avoid Cloudflare detection
puppeteer.use(StealthPlugin());

const TARGET_URL = 'https://dramadunyam.com/en/series/scorns-of-the-olympian-blood/episode-1';

async function fetchCookies() {
  let browser;
  
  try {
    console.log('Launching browser with stealth mode...');
    
    // Determine if we're in production (Render) or development
    const isProduction = process.env.NODE_ENV === 'production';
    
    const browserConfig = isProduction ? {
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
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
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      ignoreHTTPSErrors: true
    };

    browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();
    
    // Set a realistic viewport
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
    
    // Set user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    
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
      'Sec-Fetch-User': '?1',
      'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    
    // Set up navigation promise handler to catch redirects
    let navigationPromise = null;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        console.log(`Page navigated to: ${frame.url()}`);
      }
    });
    
    // Navigate to the page
    const response = await page.goto(TARGET_URL, {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 90000
    });
    
    console.log(`Initial response status: ${response.status()}`);

    // Wait longer initially for Cloudflare to start its challenge
    await page.waitForTimeout(8000);

    // Check for Cloudflare challenge and wait for it to complete
    let challengeDetected = false;
    let lastCheck = '';
    let consecutiveSuccesses = 0;
    
    for (let i = 0; i < 50; i++) {
      try {
        const url = page.url();
        
        // Get cookies without using page.evaluate()
        const cookies = await page.cookies();
        const hasCfClearance = cookies.some(c => c.name === 'cf_clearance');
        
        // Try to get title safely
        let title = '';
        try {
          title = await page.title();
        } catch (e) {
          console.log('Could not get title (page may be navigating)');
        }
        
        // If we have cf_clearance cookie and we're on the right domain
        if (hasCfClearance && url.includes('dramadunyam.com/en/series')) {
          consecutiveSuccesses++;
          console.log(`cf_clearance detected (${consecutiveSuccesses}/3 confirmations)`);
          
          // Wait for 3 consecutive successful checks to ensure stability
          if (consecutiveSuccesses >= 3) {
            console.log('Challenge passed and stable!');
            console.log(`Final URL: ${url}`);
            break;
          }
          
          await page.waitForTimeout(2000);
          continue;
        } else {
          consecutiveSuccesses = 0;
        }
        
        // Check if still on challenge
        const isChallenge = title.toLowerCase().includes('just a moment') || 
                           title.toLowerCase().includes('attention required') ||
                           url.includes('challenge');
        
        if (isChallenge || !hasCfClearance) {
          if (!challengeDetected) {
            console.log('Cloudflare challenge detected, solving...');
            challengeDetected = true;
          }
          
          const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
          const checkStatus = `Attempt ${i + 1}/50 - Cookies: ${cookies.length}, cf_clearance: ${hasCfClearance}`;
          if (checkStatus !== lastCheck) {
            console.log(checkStatus);
            lastCheck = checkStatus;
          }
          
          await page.waitForTimeout(3000);
        } else {
          // Might be done, verify
          await page.waitForTimeout(2000);
        }
        
        if (i === 49) {
          console.error('Challenge timeout - capturing debug info...');
          const finalTitle = await page.title().catch(() => 'Unable to get title');
          const finalUrl = page.url();
          const finalCookies = await page.cookies();
          const cookieNames = finalCookies.map(c => c.name).join(', ');
          console.error(`Final title: ${finalTitle}`);
          console.error(`Final URL: ${finalUrl}`);
          console.error(`Cookies (${finalCookies.length}): ${cookieNames}`);
          throw new Error('Cloudflare challenge timeout - could not pass verification after 150 seconds');
        }
      } catch (err) {
        // Handle navigation errors gracefully
        if (err.message.includes('Execution context was destroyed') || 
            err.message.includes('Cannot find context')) {
          console.log(`Navigation/context error at attempt ${i + 1}, waiting for page to stabilize...`);
          await page.waitForTimeout(5000);
          continue;
        }
        throw err;
      }
    }

    // Wait additional time for cookies to be properly set
    console.log('Challenge passed, waiting for cookies to stabilize...');
    await page.waitForTimeout(8000);

    // Get all cookies
    const cookies = await page.cookies();
    
    if (cookies.length === 0) {
      throw new Error('No cookies were set by the website');
    }

    console.log(`Fetched ${cookies.length} cookies`);
    
    // Log cookie names for debugging
    const cookieNames = cookies.map(c => c.name).join(', ');
    console.log(`Cookie names: ${cookieNames}`);
    
    // Check for required cookies (especially cf_clearance)
    const hasCfClearance = cookies.some(c => c.name === 'cf_clearance');
    console.log(`cf_clearance cookie present: ${hasCfClearance}`);
    
    if (!hasCfClearance) {
      console.warn('Warning: cf_clearance cookie not found - Cloudflare may have changed protection');
    }

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
