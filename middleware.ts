import { NextRequest, NextResponse } from 'next/server';

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  // Rate limiting is intentionally disabled for now while Redis is not configured.
  // Keep this middleware as a pass-through, then re-enable the saved scaffold below
  // when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
  void request;
  return NextResponse.next();
}

/*
Future re-enable scaffold:
- Add imports: @upstash/ratelimit and @upstash/redis
- Global limit: 100 requests/min
- Endpoint limits:
  - POST /api/tokens: 30/min
  - PATCH /api/tokens/[id]: 200/min
  - POST /api/workspaces: 10/min
  - POST /api/auth/signup: 5/min
- Return HTTP 429 with { error: 'Rate limit exceeded', retryAfter }
*/

/**
 * Configure which routes should use this middleware
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
