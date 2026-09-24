-- Gift-card purchases paid with PayPal: the buyer/recipient/message don't
-- fit in a PayPal order, so they wait here (keyed by the order's custom_id)
-- until the capture comes back; the row is deleted once the card is minted.
create table if not exists pending_paypal (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
