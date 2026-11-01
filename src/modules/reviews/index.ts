import "server-only";
import { getSetting, setSetting } from "@/modules/settings";

/**
 * Real Google reviews. Google's Places API returns a business's rating,
 * total review count, and its 5 most recent/relevant reviews — we cache
 * them in site_settings and show them on the homepage. Needs:
 *   - GOOGLE_MAPS_API_KEY env var (client's Google Cloud key, Places API enabled)
 *   - the business's Place ID saved in admin → Content → Google reviews
 */

export interface SyncResult {
  ok: boolean;
  message: string;
  count?: number;
}

export async function syncGoogleReviews(): Promise<SyncResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "GOOGLE_MAPS_API_KEY is not set — add the client's Google Cloud key first." };
  }
  const { placeId } = await getSetting("google_reviews");
  if (!placeId.trim()) {
    return { ok: false, message: "No Place ID saved yet — paste the business's Google Place ID and save." };
  }

  // Places API (New) — Google no longer enables the legacy Place Details
  // API on new Cloud projects
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId.trim())}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "rating,userRatingCount,reviews" },
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false, message: "Google Places request failed — try again in a minute." };

  const data = (await res.json().catch(() => ({}))) as {
    error?: { status?: string; message?: string };
    rating?: number;
    userRatingCount?: number;
    reviews?: {
      rating: number;
      text?: { text: string };
      relativePublishTimeDescription?: string;
      authorAttribution?: { displayName?: string; photoUri?: string };
    }[];
  };
  if (!res.ok || data.error) {
    return { ok: false, message: `Google said: ${data.error?.status ?? res.status}${data.error?.message ? ` — ${data.error.message}` : ""}` };
  }

  const reviews = (data.reviews ?? [])
    .filter((r) => r.rating >= 4 && r.text?.text?.trim()) // only show the good, non-empty ones
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? "Google user",
      rating: r.rating,
      text: r.text!.text.trim(),
      when: r.relativePublishTimeDescription ?? "",
      photo: r.authorAttribution?.photoUri ?? null,
    }));

  if (reviews.length === 0) {
    // never clobber a populated homepage strip with an empty sync
    const prior = await getSetting("google_reviews_cache");
    if (prior.reviews.length > 0) {
      return { ok: false, message: "Google returned no showable reviews — kept the existing ones." };
    }
  }
  await setSetting("google_reviews_cache", {
    fetchedAt: new Date().toISOString(),
    rating: data.rating ?? 0,
    total: data.userRatingCount ?? 0,
    reviews,
  });
  return { ok: true, message: `Synced ${reviews.length} reviews (rating ${data.rating ?? "?"} from ${data.userRatingCount ?? 0}).`, count: reviews.length };
}
