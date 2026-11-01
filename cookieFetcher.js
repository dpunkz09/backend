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
    
    // Navigate to the page
    const response = await page.goto(TARGET_URL, {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 90000
    });
    
    console.log(`Initial response status: ${response.status()}`);

    // Wait a bit for initial page load
    await page.waitForTimeout(5000);

    // Check for Cloudflare challenge and wait for it to complete
    let challengeDetected = false;
    let lastCheck = '';
    
    for (let i = 0; i < 40; i++) {
      const title = await page.title().catch(() => '');
      const url = page.url();
      
      // Check multiple Cloudflare indicators
      const content = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        return {
          hasChallengeText: body.includes('checking your browser') || 
                           body.includes('just a moment') ||
                           body.includes('verify you are human'),
          hasTitle: document.title.toLowerCase().includes('just a moment'),
          hasChallengeForm: !!document.querySelector('[action*="challenge"]'),
          hasContent: document.body.innerText.length > 100
        };
      }).catch(() => ({ hasChallengeText: false, hasTitle: false, hasChallengeForm: false, hasContent: false }));
      
      const isChallenge = content.hasChallengeText || content.hasTitle || content.hasChallengeForm;
      
      if (isChallenge) {
        if (!challengeDetected) {
          console.log('Cloudflare challenge detected, solving...');
          challengeDetected = true;
        }
        
        const checkStatus = `Attempt ${i + 1}/40 - Waiting for challenge...`;
        if (checkStatus !== lastCheck) {
          console.log(checkStatus);
          lastCheck = checkStatus;
        }
        
        await page.waitForTimeout(3000);
      } else if (content.hasContent) {
        // Challenge completed
        if (challengeDetected) {
          console.log('Cloudflare challenge passed!');
        }
        console.log(`Final URL: ${url}`);
        break;
      } else {
        // Empty content, still loading
        await page.waitForTimeout(2000);
      }
      
      if (i === 39) {
        console.error('Challenge timeout - capturing debug info...');
        const finalTitle = await page.title();
        const finalUrl = page.url();
        console.error(`Final title: ${finalTitle}`);
        console.error(`Final URL: ${finalUrl}`);
        throw new Error('Cloudflare challenge timeout - could not pass verification after 120 seconds');
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
