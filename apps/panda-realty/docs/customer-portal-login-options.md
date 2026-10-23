# Customer Portal — Login Options for Richard to Consider

**What this document is about:** Before I build the login system for your client portal, I need your decision on how your clients will access it. There are three approaches. This document explains each in plain English — no technical knowledge needed.

---

## Quick Summary

| | Option A: Email + Password | Option B: Magic Link | Option C: Private Link |
|---|---|---|---|
| Client experience | Familiar — like any website login | Modern — click a link in their email, no password | Simplest — one private URL, bookmark and done |
| Password required | Yes | No | No |
| Email needed each visit | No | Yes | No |
| Free to start | Yes | Yes (with a note — see below) | Yes |
| Upgrade needed | Very unlikely | Very unlikely | Not applicable |
| Best for | Clients who prefer the traditional way | Clients who want no password but don't mind checking email | Clients who want one-tap access with zero friction |

---

## Option A — Email + Password Login

This is the standard approach used by most websites. You assign each client an email address and they create a password. Every time they want to access the portal, they go to the login page, type their email and password, and they're in.

### What it looks like for your client

1. They receive an invitation email.
2. They click the link and set up a password (once only).
3. From that point on, they visit the portal, type their email and password, and they're in.

### Pros

- **Familiar.** Every client has used a login page before. No learning curve.
- **Always accessible.** Once set up, they can log in without needing to check their email first.
- **Full control.** If a client leaves the deal, you can revoke their access instantly.

### Cons

- **Forgotten passwords.** Some clients will forget their password and need a reset email. This is a minor inconvenience but does happen.
- **One extra setup step.** Clients have to create their password before first use.

---

## Option B — Magic Link Login (No Password)

With Magic Links, there is no password at all. When a client wants to log into the portal, they enter their email address, and I send them a private link. They click that link, and they're instantly logged in. The link expires after it's used — so it's one-time and secure.

This is the same technology used by apps like Notion, Slack, and many modern services.

### What it looks like for your client

1. They go to the portal login page.
2. They type their email address and click "Send me a link."
3. They check their email, click the link, and they're in — no password ever required.

### Pros

- **Zero passwords to remember.** Clients never get locked out due to a forgotten password.
- **Very secure.** Each link works once and expires shortly after — it cannot be reused.
- **Dead simple.** Clients who aren't tech-savvy find this easier than setting up a password.

### Cons

- **Requires email access each time.** If a client wants to log in, they must have their email inbox open and available. This is a minor friction if they're checking the portal regularly.
- **Small email setup required.** The standard free system only sends 2 emails per hour — fine for occasional testing, but not for real-world use where several clients might log in around the same time. I'd connect a free email delivery service (like Resend or SendGrid) to fix this. It's a one-time setup on my side — no extra cost or action from you.

---

## Option C — Private Link (No Login Screen at All)

This is the simplest approach of the three and is already how your buyer offer forms work today. Instead of a login screen, each client receives one unique, private web address — like a secret URL that belongs only to them. They bookmark it, and whenever they want to check their portal, they just open that bookmark. That's it.

There is no login page, no email, no password — the link itself is their key.

### What it looks like for your client

1. You invite them from your admin panel — this generates their private link.
2. You send that link to them however you like (email, text, WhatsApp).
3. They bookmark it. From then on, they open the bookmark and they're straight into their portal.

### Pros

- **Absolute minimum friction.** One bookmark, one tap — they're in. No steps to forget.
- **No accounts to manage.** No passwords, no email system, no user accounts on your end.
- **Works on any device.** No app, no login — just a link in their browser.
- **Completely free — no platform limits apply.** Because no user accounts are created, the Supabase user limits discussed below simply don't apply at all.

### Cons

- **The link is the key.** If a client accidentally shares or forwards the link to someone else, that person could access their portal. In practice this is rare, but it's worth knowing.
- **No "forgot my login" fallback.** If a client loses the link and deletes the email it was sent in, you'd need to resend it from your admin panel. A 30-second task on your end, but worth mentioning.
- **Less formal.** For clients who expect a proper login page, this can feel unusual — though most find it a pleasant surprise.

---

## What About Limits and Cost?

*(This section applies to Options A and B only. Option C has no platform user limits.)*

**The platform I use (Supabase) allows up to 50,000 active users per month on the free plan.**

To put that in perspective: that would require 50,000 different people logging into your portal within a single month. For a real estate agency of your size, you would likely have somewhere between 10 and 100 active clients using the portal at any point in time — nowhere near that ceiling.

**In short: the free limit will almost certainly never be a concern for your portal.**

However, if your business grows significantly and you ever did approach that number, here is what an upgrade would look like:

| Plan | Monthly Cost | User Limit |
|------|-------------|------------|
| Free (current) | $0 | 50,000 active users/month |
| Pro (next tier) | $25/month (approx. AU$39/month) | 100,000 active users/month |

The upgrade is a simple switch — nothing changes for your clients when it happens.

---

## My Recommendation

**Option C (Private Link)** is the simplest to roll out and the most friction-free experience for your clients — and it's already the pattern used by the buyer offer forms in the app today, so it's a proven approach in your workflow.

If having a formal login page is important to you or your clients expect it, **Option B (Magic Link)** is the next best choice — modern, secure, and no passwords to manage.

**Option A (Email + Password)** is perfectly solid but comes with the most client overhead (password setup, potential resets) for no meaningful security benefit over the other two options.

---

## Decision

**Richard chose Option C — Private Link.** *(2026-05-26)*

---

*Prepared: 2026-05-26 | For: Richard (portal login decision) | Related: [Customer Portal Investigation](../../docs/richard-customer-portal-investigation.md)*
