import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRateLimitConfig = Boolean(redisUrl && redisToken);

const redis = hasRateLimitConfig ? new Redis({ url: redisUrl as string, token: redisToken as string }) : null;

const globalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      prefix: "tokn:ratelimit:global",
    })
  : null;

const workspaceCreateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "tokn:ratelimit:workspaces:create",
    })
  : null;

const signupLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "tokn:ratelimit:auth:signup",
    })
  : null;

const tokenCreateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "tokn:ratelimit:tokens:create",
    })
  : null;

const tokenPatchLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, "1 m"),
      prefix: "tokn:ratelimit:tokens:patch",
    })
  : null;

function getIdentifier(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  return `${ip}:${ua.slice(0, 64)}`;
}

function endpointLimiter(pathname: string, method: string) {
  if (pathname === "/api/workspaces" && method === "POST") {
    return workspaceCreateLimiter;
  }
  if (pathname === "/api/auth/signup" && method === "POST") {
    return signupLimiter;
  }
  if (/^\/api\/workspaces\/[^/]+\/tokens$/.test(pathname) && method === "POST") {
    return tokenCreateLimiter;
  }
  if (/^\/api\/workspaces\/[^/]+\/tokens\/[^/]+$/.test(pathname) && method === "PATCH") {
    return tokenPatchLimiter;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!hasRateLimitConfig || !globalLimiter) {
    return NextResponse.next();
  }

  const identifier = getIdentifier(request);
  const globalResult = await globalLimiter.limit(identifier);
  if (!globalResult.success) {
    const retryAfter = Math.max(1, Math.ceil((globalResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  const limiter = endpointLimiter(request.nextUrl.pathname, request.method.toUpperCase());
  if (!limiter) {
    return NextResponse.next();
  }

  const endpointResult = await limiter.limit(identifier);
  if (!endpointResult.success) {
    const retryAfter = Math.max(1, Math.ceil((endpointResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return NextResponse.next();
}

/**
 * Configure which routes should use this middleware
 */
export const config = {
  matcher: [
    "/api/:path*",
  ],
};
