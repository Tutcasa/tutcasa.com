import "server-only";
import { getDb } from "@/lib/db";
import { notifyTourBooking } from "@/modules/notifications";
import type { Tour, TourBooking, TourBookingRequest, TourReserveResult } from "./types";

interface TourRow {
  id: string; slug: string; title: string; subtitle: string | null;
  partner: string; city: string | null; duration_label: string | null;
  description: string | null; highlights: string[]; price_cents: number;
  currency: string; min_group: number; max_group: number;
  category: "tour" | "park"; status: Tour["status"];
}

function toTour(r: TourRow): Tour {
  return {
    id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle,
    partner: r.partner, city: r.city, durationLabel: r.duration_label ?? "",
    description: r.description ?? "", highlights: r.highlights ?? [],
    priceCents: r.price_cents, currency: r.currency,
    minGroup: r.min_group, maxGroup: r.max_group,
    category: r.category, status: r.status,
  };
}

const SELECT = `id, slug, title, subtitle, partner, city, duration_label,
  description, highlights, price_cents, currency, min_group, max_group,
  category, status`;

export async function listTours(opts?: { category?: "tour" | "park"; includeUnpublished?: boolean }): Promise<Tour[]> {
  const wh: string[] = [];
  const args: unknown[] = [];
  if (!opts?.includeUnpublished) wh.push(`status = 'published'`);
  else wh.push(`status <> 'archived'`);
  if (opts?.category) { args.push(opts.category); wh.push(`category = $${args.length}`); }
  const res = await getDb().query<TourRow>(
    `select ${SELECT} from tours where ${wh.join(" and ")} order by category, price_cents`,
    args,
  );
  return res.rows.map(toTour);
}

export async function tourBySlug(slug: string): Promise<Tour | null> {
  const res = await getDb().query<TourRow>(
    `select ${SELECT} from tours where slug = $1`, [slug]);
  return res.rows[0] ? toTour(res.rows[0]) : null;
}

export function fmtMXN(cents: number): string {
  return `${(cents / 100).toLocaleString("en-US")} MXN`;
}

/** Create the booking, then fire partner/guest notifications. */
export async function createTourBooking(req: TourBookingRequest): Promise<TourReserveResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.tourDate) || req.tourDate < new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "INVALID_DATE" };
  }
  const name = req.guestName?.trim();
  const email = req.guestEmail?.trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "INVALID_CONTACT" };
  }
  const tour = await tourBySlug(req.tourSlug);
  if (!tour || tour.status !== "published") return { ok: false, error: "TOUR_NOT_FOUND" };
  if (tour.priceCents <= 0) return { ok: false, error: "ON_REQUEST" };
  if (req.groupSize < tour.minGroup || req.groupSize > tour.maxGroup) {
    return { ok: false, error: "INVALID_GROUP" };
  }

  const total = tour.priceCents * req.groupSize;
  const res = await getDb().query<{ id: string }>(
    `insert into tour_bookings
       (tour_id, guest_name, guest_email, guest_phone, tour_date, group_size,
        status, total_cents, currency, notes)
     values ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9) returning id`,
    [tour.id, name, email, req.guestPhone?.trim() || null, req.tourDate,
     req.groupSize, total, tour.currency, req.notes?.trim() || null],
  );
  const id = res.rows[0].id;

  await notifyTourBooking({
    tourBookingId: id,
    tourTitle: tour.title,
    tourDate: req.tourDate,
    groupSize: req.groupSize,
    totalLabel: fmtMXN(total),
    guestName: name,
    guestEmail: email,
    guestPhone: req.guestPhone,
    notes: req.notes,
    ref: id.slice(0, 8).toUpperCase(),
  });

  return { ok: true, bookingId: id };
}

interface TourBookingRow {
  id: string; tour_id: string; title: string;
  tour_date: string; group_size: number; status: TourBooking["status"];
  total_cents: number; currency: string; guest_name: string;
  guest_email: string; guest_phone: string | null; notes: string | null;
  partner_notified_at: string | null; partner_confirmed_at: string | null;
  created_at: string;
}

function toTourBooking(r: TourBookingRow): TourBooking {
  return {
    id: r.id, tourId: r.tour_id, tourTitle: r.title,
    tourDate: r.tour_date, groupSize: r.group_size, status: r.status,
    totalCents: r.total_cents, currency: r.currency,
    guestName: r.guest_name, guestEmail: r.guest_email,
    guestPhone: r.guest_phone, notes: r.notes,
    partnerNotifiedAt: r.partner_notified_at,
    partnerConfirmedAt: r.partner_confirmed_at, createdAt: r.created_at,
  };
}

const TB_SELECT = `tb.id, tb.tour_id, t.title,
  to_char(tb.tour_date,'YYYY-MM-DD') as tour_date, tb.group_size, tb.status,
  tb.total_cents, tb.currency, tb.guest_name, tb.guest_email, tb.guest_phone,
  tb.notes, tb.partner_notified_at, tb.partner_confirmed_at, tb.created_at
  from tour_bookings tb join tours t on t.id = tb.tour_id`;

export async function getTourBooking(id: string): Promise<TourBooking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await getDb().query<TourBookingRow>(
    `select ${TB_SELECT} where tb.id = $1`, [id]);
  return res.rows[0] ? toTourBooking(res.rows[0]) : null;
}

export async function listTourBookings(): Promise<TourBooking[]> {
  const res = await getDb().query<TourBookingRow>(
    `select ${TB_SELECT} order by tb.created_at desc limit 200`);
  return res.rows.map(toTourBooking);
}

/** Admin: create or update a tour (id null = create). */
export async function upsertTour(input: {
  id?: string; title: string; subtitle?: string; city?: string;
  durationLabel?: string; description?: string; priceMXN: number;
  minGroup: number; maxGroup: number; category: "tour" | "park";
  status: "draft" | "published" | "archived";
}): Promise<{ ok: boolean; error?: string }> {
  const slugBase = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!input.title.trim() || input.priceMXN < 0) return { ok: false, error: "INVALID" };
  const db = getDb();
  if (input.id) {
    await db.query(
      `update tours set title=$2, subtitle=$3, city=$4, duration_label=$5,
         description=$6, price_cents=$7, min_group=$8, max_group=$9,
         category=$10, status=$11 where id=$1`,
      [input.id, input.title, input.subtitle ?? null, input.city ?? null,
       input.durationLabel ?? null, input.description ?? null,
       Math.round(input.priceMXN * 100), input.minGroup, input.maxGroup,
       input.category, input.status],
    );
  } else {
    await db.query(
      `insert into tours (slug, title, subtitle, city, duration_label,
         description, price_cents, currency, min_group, max_group, category, status)
       values ($1,$2,$3,$4,$5,$6,$7,'MXN',$8,$9,$10,$11)
       on conflict (slug) do nothing`,
      [slugBase, input.title, input.subtitle ?? null, input.city ?? null,
       input.durationLabel ?? null, input.description ?? null,
       Math.round(input.priceMXN * 100), input.minGroup, input.maxGroup,
       input.category, input.status],
    );
  }
  return { ok: true };
}

export async function setTourBookingStatus(id: string, status: TourBooking["status"]): Promise<void> {
  await getDb().query(
    `update tour_bookings set status=$2,
       partner_confirmed_at = case when $2='partner_confirmed' then now() else partner_confirmed_at end
     where id=$1`, [id, status]);
}
