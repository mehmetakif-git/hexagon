// Vercel Edge Middleware - AI Bot Protection
// © Allync - www.allync.com.tr

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

// Known AI bot user agents and patterns
const AI_BOT_PATTERNS = [
  // OpenAI
  'gptbot', 'chatgpt', 'oai-searchbot',
  // Anthropic
  'anthropic', 'claude', 'claudebot',
  // Google AI
  'google-extended', 'bard',
  // Other AI
  'ccbot', 'cohere-ai', 'perplexitybot', 'youbot',
  'bytespider', 'amazonbot', 'facebookbot',
  // Generic fetch tools often used by AI
  'node-fetch', 'axios', 'python-requests', 'go-http-client',
  'curl', 'wget', 'httpie', 'postman',
  // Scrapers
  'scrapy', 'beautifulsoup', 'selenium', 'puppeteer', 'playwright',
  'headless', 'phantom',
];

// Suspicious patterns in requests
const SUSPICIOUS_HEADERS = [
  'x-openai', 'x-anthropic', 'x-claude', 'x-gpt',
];

export default function middleware(request) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const referer = request.headers.get('referer') || '';
  const origin = request.headers.get('origin') || '';
  const url = new URL(request.url);

  // Check for AI bot user agents
  const isAIBot = AI_BOT_PATTERNS.some(pattern => userAgent.includes(pattern));

  // Check for suspicious headers
  const hasSuspiciousHeaders = SUSPICIOUS_HEADERS.some(header =>
    request.headers.has(header)
  );

  // Check for empty or missing user agent (common in programmatic access)
  const hasNoUserAgent = !userAgent || userAgent.length < 10;

  // Check if accessing sensitive paths without proper referer
  const isSensitivePath = url.pathname.startsWith('/assets/') ||
                          url.pathname.startsWith('/src/');
  const hasValidReferer = referer.includes(url.hostname) ||
                          origin.includes(url.hostname);

  // Block conditions
  if (isAIBot || hasSuspiciousHeaders) {
    return new Response(
      JSON.stringify({
        error: 'Access denied',
        message: 'Automated access is not permitted on this website.',
        info: '© Allync - www.allync.com.tr'
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Robots-Tag': 'noai, noimageai',
        }
      }
    );
  }

  // Block direct access to assets without valid referer (hotlink protection)
  if (isSensitivePath && !hasValidReferer && request.method === 'GET') {
    // Allow if it's a browser navigation (has accept header for HTML)
    const acceptHeader = request.headers.get('accept') || '';
    const isBrowserNavigation = acceptHeader.includes('text/html');

    if (!isBrowserNavigation && hasNoUserAgent) {
      return new Response('Forbidden', {
        status: 403,
        headers: {
          'X-Robots-Tag': 'noindex, noai',
        }
      });
    }
  }

  // Continue with request - don't block normal traffic
  // Return undefined to continue to the actual page
  return;
}
