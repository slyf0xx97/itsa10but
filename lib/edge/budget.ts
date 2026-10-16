import { sgtDay } from "./html.ts";

/** The site's own Firecrawl key may be used this many times a day (Singapore time). A visitor's own key is never counted. */
export const DEFAULT_FIRECRAWL_DAILY = 25;

/** Reads the FIRECRAWL_DAILY setting: a whole number from 0 up, else the default. 0 switches the site key off. */
export function firecrawlDailyCap(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value >= 0 && value <= 100_000 ? value : DEFAULT_FIRECRAWL_DAILY;
}

/** The D1 counter row for today's spend of the site key. */
export const firecrawlBudgetId = (now: number): string => `firecrawl|${sgtDay(now)}`;

/** A search needs the web unless it is a company query that Wikipedia and Wikidata already answered well. */
export const needsWeb = (isCompanyQuery: boolean, nativeHits: number): boolean => !isCompanyQuery || nativeHits < 3;
