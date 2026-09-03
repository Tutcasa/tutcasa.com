# tutcasa.com DNS snapshot — 2026-09-03
# Verify these exist in Cloudflare after the import

## Root
A @ -> 35.209.44.78 
AAAA @ -> 

## WWW
www -> 35.209.44.78 

## Email (CRITICAL — Google Workspace)
MX @ -> 1 aspmx.l.google.com.
MX @ -> 5 alt2.aspmx.l.google.com.
MX @ -> 10 alt4.aspmx.l.google.com.
MX @ -> 10 alt3.aspmx.l.google.com.
MX @ -> 5 alt1.aspmx.l.google.com.

## TXT on root (SPF + verifications)
TXT @ -> "v=spf1 +a +mx include:tutcasa.com.spf.auto.dnssmarthost.net ~all"
TXT @ -> "google-site-verification=RgTbd70UeG5aFr4HIMlleYKo5owFoXex6SUwWfalNlo"

## DMARC (currently DUPLICATED — keep only ONE in Cloudflare)
TXT _dmarc -> "v=DMARC1; p=none; aspf=r; adkim=r;"
TXT _dmarc -> "v=DMARC1; p=none;"

## DKIM (Google + Resend)
TXT resend._domainkey -> "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHT27+fz2uFxRpShbR+fqX1zMSaeW58r1bqAkiZ...
CNAME default._domainkey -> tutcasa.com.default.dkim.auto.dnssmarthost.net.

## Common subdomains
mail -> 35.209.44.78
ftp -> 35.209.44.78
autodiscover -> 35.209.44.78

---
## Migration notes (read before/after the Cloudflare import)

1. KEEP AS-IS during import: all MX records, google-site-verification TXT,
   resend._domainkey TXT. These are what keep Gmail + Resend + Search
   Console alive.
2. DMARC: create only ONE record in Cloudflare:
   "v=DMARC1; p=none; aspf=r; adkim=r;"  (fixes the current duplicate)
3. SPF is SITEGROUND-DEPENDENT: the current value includes
   tutcasa.com.spf.auto.dnssmarthost.net (a SiteGround service). Once off
   SiteGround, replace the root TXT with:
   "v=spf1 include:_spf.google.com ~all"
4. default._domainkey CNAME points at SiteGround's DKIM — it dies when
   SiteGround is cancelled. Safe to drop at that point (Google/Resend
   have their own signing).
5. mail/ftp/autodiscover point at the SiteGround server — unused by
   Google Workspace; safe to drop after cancellation.
6. MISSING: google._domainkey (Google Workspace DKIM) appears NOT set up.
   Optional improvement: enable DKIM in Google Admin console and add the
   record in Cloudflare — better email deliverability.
7. LAUNCH FLIP (later, in Cloudflare only): change A @ and www from
   35.209.44.78 to the new platform (Vercel gives the exact values when
   the domain is added to the project).
