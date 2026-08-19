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

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId.trim())}` +
    `&fields=rating,user_ratings_total,reviews&reviews_sort=newest&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return { ok: false, message: "Google Places request failed — try again in a minute." };

  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    result?: {
      rating?: number;
      user_ratings_total?: number;
      reviews?: {
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
        profile_photo_url?: string;
      }[];
    };
  };
  if (data.status !== "OK" || !data.result) {
    return { ok: false, message: `Google said: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}` };
  }

  const reviews = (data.result.reviews ?? [])
    .filter((r) => r.rating >= 4 && r.text?.trim()) // only show the good, non-empty ones
    .map((r) => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text.trim(),
      when: r.relative_time_description,
      photo: r.profile_photo_url ?? null,
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
    rating: data.result.rating ?? 0,
    total: data.result.user_ratings_total ?? 0,
    reviews,
  });
  return { ok: true, message: `Synced ${reviews.length} reviews (rating ${data.result.rating ?? "?"} from ${data.result.user_ratings_total ?? 0}).`, count: reviews.length };
}
