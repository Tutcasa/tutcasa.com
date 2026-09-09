-- 0037_addon_group_modes.sql
-- Extra options can now depend on party size: 'for_4' applies to groups
-- of up to 4 guests, 'over_4' to larger groups (both charged once per
-- stay). The booking's own guest count decides — nothing to ask twice.

begin;

alter table public.listing_addons
  drop constraint if exists listing_addons_mode_check;
alter table public.listing_addons
  add constraint listing_addons_mode_check check (mode = any (array[
    'flat'::text, 'per_night'::text, 'per_guest'::text,
    'per_guest_night'::text, 'for_4'::text, 'over_4'::text]));

commit;
