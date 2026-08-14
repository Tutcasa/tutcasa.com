# TutCasa — DNS & Hosting Migration (M5 prep)

**No domain transfer is involved.** The domain stays registered at GoDaddy. Only nameservers + hosting change.

| Layer | Current | Target | Action |
|---|---|---|---|
| Registrar | **GoDaddy** | GoDaddy | ✅ none — do NOT transfer |
| DNS / nameservers | ns1/ns2.siteground.net | **Cloudflare** (free) | change 2 NS fields in GoDaddy |
| Web hosting | SiteGround `35.209.44.78` | **Vercel** | repoint A/CNAME after deploy |
| Email | **Google Workspace** | Google Workspace | unchanged — but MX/SPF/DKIM must be carried over |

Domain created 2024-06-30. Registrar locks (`clientTransferProhibited`, `clientUpdateProhibited`) are GoDaddy defaults; GoDaddy lifts them internally for nameserver edits made in its own dashboard.

---

## Live zone snapshot (captured 2026-08-12, before any change)

Use this as the checklist when rebuilding the zone in Cloudflare. **Every line must exist in Cloudflare before switching nameservers.**

```
NS      tutcasa.com          ns1.siteground.net.
NS      tutcasa.com          ns2.siteground.net.

A       tutcasa.com          35.209.44.78
A       www                  35.209.44.78
A       mail                 35.209.44.78
A       ftp                  35.209.44.78
A       autodiscover         35.209.44.78

MX      tutcasa.com     1    aspmx.l.google.com.
MX      tutcasa.com     5    alt1.aspmx.l.google.com.
MX      tutcasa.com     5    alt2.aspmx.l.google.com.
MX      tutcasa.com    10    alt3.aspmx.l.google.com.
MX      tutcasa.com    10    alt4.aspmx.l.google.com.

TXT     tutcasa.com          "v=spf1 +a +mx include:tutcasa.com.spf.auto.dnssmarthost.net ~all"
TXT     tutcasa.com          "google-site-verification=RgTbd70UeG5aFr4HIMlleYKo5owFoXex6SUwWfalNlo"
TXT     _dmarc               "v=DMARC1; p=none; aspf=r; adkim=r;"
TXT     _dmarc               "v=DMARC1; p=none;"                       <-- DUPLICATE, see issue 2
CNAME   default._domainkey   tutcasa.com.default.dkim.auto.dnssmarthost.net.

(no AAAA, no CAA records)
```

⚠️ This snapshot is from public DNS queries. Before migrating, also export the zone from the SiteGround control panel — private/internal records (and any record not guessed by subdomain probing) may not appear here.

---

## Issues found — fix during the migration

**1. Email auth is tied to SiteGround infrastructure (breaks when you leave).**
SPF `include:` and the DKIM `CNAME` both point at `*.auto.dnssmarthost.net`, which is SiteGround's managed email-auth service. **When SiteGround is cancelled, SPF and DKIM break** → mail lands in spam. Fix: rebuild SPF/DKIM on Google Workspace's own values before retiring SiteGround.

**2. Two DMARC records exist — this is invalid.**
A domain must publish exactly one `_dmarc` TXT record. With two, DMARC evaluation fails/ignores the policy. Fix: keep one, delete the other.

**3. SPF does not authorize Google Workspace's senders.**
Mail is on Google Workspace, but SPF has no `include:_spf.google.com`. `+mx` only authorizes the *receiving* aspmx hosts, not Google's outbound relays — so outbound mail is not properly SPF-authenticated (soft-failing under `~all`). Fix, roughly:
```
v=spf1 include:_spf.google.com include:amazonses.com ~all   # (Resend include added at M3)
```

**4. `google-site-verification` TXT must be preserved.**
This is the Google Search Console verification. Losing it costs Search Console access — which M5 (SEO migration, sitemap submission, 404 monitoring) depends on. Good news: it confirms Search Console is already set up for this domain.

**5. `mail`, `ftp`, `autodiscover`, `www` all point at SiteGround.**
`www` must move to Vercel with the root. `ftp`/`autodiscover` become dead once SiteGround is gone — `autodiscover` is an Outlook/Exchange helper and is not needed for Google Workspace; drop them unless something depends on them.

---

## Cutover order (zero-downtime)

1. **Export the full zone** from SiteGround's control panel (don't rely only on the snapshot above).
2. **Add tutcasa.com to Cloudflare**; let it auto-import, then **verify every record** against the checklist — especially MX + TXT.
3. Fix issues 1–3 above while building the zone (correct SPF, single DMARC, Google DKIM).
4. **Change nameservers at GoDaddy** → Cloudflare's two. Domain is *not* transferred.
5. Confirm mail still flows + `dig MX/TXT` matches. Let it settle.
6. **Lower TTLs** (e.g. 300s) on the records that will change, ahead of the hosting flip.
7. Deploy the platform to Vercel; test on a `*.vercel.app` / preview domain first.
8. Ship the **301 redirect map** (crawl old site first) with the deploy.
9. **Flip A/CNAME** for root + `www` to Vercel.
10. Verify: site loads, email works, redirects resolve, Search Console has no 404 spike.
11. **Keep SiteGround alive 30–60 days** as rollback + reference. Only then cancel — and only after SPF/DKIM no longer depend on it (issue 1).

## Cost note
Vercel Hobby is non-commercial; a business site needs **Pro ≈ $20/mo**. With Supabase Pro (~$25/mo) ≈ $45/mo total, offset by cancelling SiteGround. Cloudflare DNS is free.
