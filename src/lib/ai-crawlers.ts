/**
 * User-Agent crawler AI / scraping yang sering dihormati industri.
 * Blok = best-effort; bot yang memalsukan UA browser tetap bisa lewat.
 */

const AI_CRAWLER_PATTERNS: RegExp[] = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,
  /Google-Extended/i,
  /GoogleOther/i,
  /ClaudeBot/i,
  /anthropic-ai/i,
  /Bytespider/i,
  /CCBot/i,
  /PerplexityBot/i,
  /Perplexity-User/i,
  /Amazonbot/i,
  /meta-externalagent/i,
  /FacebookBot/i,
  /cohere-ai/i,
  /Diffbot/i,
  /ImagesiftBot/i,
  /omgili/i,
  /YouBot/i,
  /Applebot-Extended/i,
];

export function isKnownAiCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return AI_CRAWLER_PATTERNS.some((re) => re.test(userAgent));
}
