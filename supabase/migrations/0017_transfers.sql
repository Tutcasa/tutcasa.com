-- 0017_transfers.sql
-- Free ARRIVAL airport transfer per booking (departure not included).
-- Filled by the TutCasa team or by the guest via their booking page;
-- pushed to Amanah (the transfer agent) over the partner API; Amanah
-- drives the status: requested -> confirmed | need_details (+note, loops
-- back) -> done. Guest<->Amanah contact happens on a prefilled WhatsApp
-- deep link that never includes TutCasa.

begin;

create table if not exists public.transfers (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  full_name     text not null,
  travel_date   date not null,
  flight_number text not null,
  passengers    int  not null default 1 check (passengers between 1 and 20),
  baby_seat     boolean not null default false,
  note          text,
  status        text not null default 'requested'
                check (status in ('requested','confirmed','need_details','done','cancelled')),
  amanah_note   text,               -- Amanah's comment on need_details
  sent_at       timestamptz,        -- last successful push to Amanah
  filled_by     text not null default 'admin' check (filled_by in ('admin','guest')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint one_transfer_per_booking unique (booking_id)
);
alter table public.transfers enable row level security; -- server-only

create trigger trg_transfers_updated before update on public.transfers
for each row execute function public.set_updated_at();

commit;
