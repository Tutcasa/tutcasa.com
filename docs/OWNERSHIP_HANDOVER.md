# TutCasa — Account Ownership & Client Handover

**The problem:** the build currently sits inside Maher's personal accounts (`papaya25` on GitHub, a shared Supabase org). At the end of the engagement the client must own the platform — and Maher must not hand over personal/work credentials.

**The solution, in order of preference:**

**A. Best — the client owns the account from the start.** The client signs up (their email, their card, their 2FA/password) and invites Maher as a member/admin. There is nothing to "hand over" at the end because it was never Maher's; he simply leaves. The client also pays their own infrastructure bill directly. Use this for **Stripe without exception**, and prefer it for Supabase, GitHub and Vercel.

**B. Fallback — build in a dedicated organization, transfer later.** If the client can't set accounts up right now and it would stall the build, work in a dedicated *organization* (never a personal namespace). Both Supabase and GitHub support transferring projects/repos to a client-owned org later. At handover, invite the client as Owner and remove yourself.

> The distinction that matters: **a client-owned account is correct; a second account created under *your own* identity to dodge free-tier limits is not** — that violates provider terms and puts client production data in a shadow account. "Client-owned" means the client controls the credentials and billing.

---

## Current state (2026-08-12)

| Thing | Where it lives | Problem |
|---|---|---|
| Supabase org "Tutcasa" (free) | contains **both** `Tutcasa demo` **and** `Amanah vacations` | Two different clients commingled; Amanah's live DB sits in an org named after another client |
| `Amanah vacations` project | ACTIVE — **live production, must not be paused or disturbed** | — |
| `Tutcasa demo` project | INACTIVE (auto-paused, free-tier limit) | blocks all TutCasa build work |
| GitHub `tutcasa-demo` | `github.com/papaya25/…` (personal) | client work under a personal account |
| **Platform repo** | local only, **no git remote** | 🚨 **not backed up anywhere — single disk failure loses everything** |

---

## Safe migration sequence (do NOT touch the live Amanah project)

The instinct is to move Amanah out — **don't**. It's live. Move the *paused* project instead; it serves no traffic, so the risk is zero.

1. **Rename** the existing org `Tutcasa` → **`Amanah Vacations`**. (Amanah stays exactly where it is, untouched, still free.)
2. **Create a new org** → **`TutCasa`**.
3. **Transfer the paused `Tutcasa demo` project** into the new `TutCasa` org (Project Settings → General → Transfer project). Zero traffic risk.
4. **Upgrade only the `TutCasa` org to Pro.** Amanah stays on free and keeps running.
5. Restore/unpause the TutCasa project → build resumes.

Result: one paid org (the client's), one free org (Amanah), clients fully separated, and the TutCasa org is already shaped for handover.

---

## Who should own what — set this up BEFORE it matters

| Service | Who must own it | Notes |
|---|---|---|
| **Stripe** | 🔴 **The client — from day one** | KYC/identity and payouts are tied to the account holder. A Stripe account created under Maher's identity **cannot be cleanly handed over**, and payouts would land in Maher's bank. Client must create it; Maher gets team access. **Decide before M2.** |
| **Domain (GoDaddy)** | Client | Confirm whose GoDaddy account holds tutcasa.com. See [DNS_MIGRATION.md](./DNS_MIGRATION.md). |
| **Supabase** | Client (org ownership transferred at handover) | Build in a `TutCasa` org; client can attach their own card to the org's billing. |
| **GitHub** | Client org, or transfer repo at handover | Create a free `tutcasa` GitHub org; repos live there, Maher is admin until handover. |
| **Vercel** | Client (Vercel Team) | Same pattern — Teams, not personal projects. Pro ≈ $20/mo. |
| **Google Workspace / Search Console** | Client (already theirs) | Preserve the `google-site-verification` TXT. |
| **Resend** | Client | Domain verification lands in the client's DNS anyway. |
| **PriceLabs / Hostaway** (later) | Client | Existing client subscriptions. |
| **SiteGround** | Client | Keep 30–60 days post-launch, then cancel. |

### Handover checklist (end of engagement)
- Invite client as **Owner** on: Supabase org, GitHub org, Vercel team
- Move billing to the client's payment method on each
- Confirm Stripe/Resend/domain are already in client-owned accounts
- **Remove Maher's membership** from each org
- Hand over the docs (`BUILD_PLAN.md`, `DNS_MIGRATION.md`, this file) — they live in the repo, so they transfer with it
- Rotate any shared secrets (`ADMIN_PASSWORD`, service-role keys) after access changes

---

## 🚨 Immediate: back up the platform repo
The Next.js platform has commits but **no remote**. Before any account restructuring, push it somewhere — ideally the new `tutcasa` GitHub org, private. Verify `.gitignore` excludes `.env.local` and all keys first.
