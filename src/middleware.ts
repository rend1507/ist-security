import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isKnownAiCrawler } from "@/lib/ai-crawlers";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // Biarkan bot patuh membaca robots.txt (isi: Disallow semua).
  if (path === "/robots.txt") {
    return NextResponse.next();
  }

  const ua = req.headers.get("user-agent");
  if (isKnownAiCrawler(ua)) {
    return new NextResponse("Crawling / AI scrapers are not allowed.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag":
          "noindex, nofollow, noarchive, nosnippet, noai, noimageai",
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
  ],
};
