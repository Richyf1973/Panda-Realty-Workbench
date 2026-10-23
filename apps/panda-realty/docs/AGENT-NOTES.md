# Panda Realty — Agent Notes

Cross-cutting facts and one-time setup steps that are not obvious from the code.

---

## Adobe Sign — Webhook Registration (one-time manual step)

After deployment, register the webhook URL with Adobe Sign so the app is notified when clients sign or decline.

**Account:** applications@mypandarealty.com.au (Richard's Adobe account)

**Steps:**

1. Sign in to [Adobe Acrobat Sign](https://secure.au1.adobesign.com)
2. Go to **Account → Webhooks** (top navigation → Account → Webhooks)
3. Click **Create**
4. Set the following:
   - **Name:** Panda Realty — Agreement Events
   - **Scope:** Account
   - **URL:** `https://<production-domain>/api/webhooks/adobe-sign?token=<ADOBE_SIGN_WEBHOOK_TOKEN>`
     - Replace `<production-domain>` with the live Vercel domain (e.g. `panda.mypandarealty.com.au`)
     - Replace `<ADOBE_SIGN_WEBHOOK_TOKEN>` with the value from `apps/panda-realty/.env.local` (or Vercel env). The endpoint returns **500** if this env var is not set and **401** if the token doesn't match — fail-closed by design.
   - **Events to subscribe:**
     - `Agreement Action Completed` (maps to `AGREEMENT_ACTION_COMPLETED`)
     - `Agreement Action Declined` (maps to `AGREEMENT_ACTION_DECLINED`)
     - `Agreement Recalled` (maps to `AGREEMENT_RECALLED`)
5. Click **Save**

Adobe Sign will send a GET request to the URL immediately on save to verify ownership.
The app responds with `{ "xAdobeSignClientId": "EchoSign2" }`, confirming the registration.

**Auth:** Primary auth is the unguessable `?token=` query param — compared with `timingSafeEqual` (SHA-256 hashes) to prevent timing attacks. `x-adobesign-clientid: EchoSign2` is a secondary sanity check only.

**Token rotation:** If `ADOBE_SIGN_WEBHOOK_TOKEN` is rotated in env, re-register the webhook URL with the new token value.

**Log scrubbing:** The `?token=` value appears in CDN/proxy access logs (Adobe Sign embeds it in the request URL). Scrub this query param from access logs at the infrastructure layer.

**Local testing:** Use `ngrok` or similar to expose `localhost:3014` to the internet, then register the ngrok URL (with `?token=` param) temporarily. Remove after testing.

---

## Dev Ports

Ports are not fixed. Always read `apps/<app>/.env.local` for `PORT=`. In the main checkout, base ports are 3000–3014; worktrees add an offset.

---

## Session Refresh (Adobe Sign IMS Credentials)

Adobe Sign auth uses IMS implicit flow (`prompt=none`) with `ADOBE_SIGN_IMS_SID` cookie. Sessions last several weeks. When the session expires, re-run the Playwright setup:

1. Run `/playwright` against `acrobat.adobe.com` and sign in as `applications@mypandarealty.com.au`
2. Extract the `ims_sid` cookie value from the browser
3. Update `ADOBE_SIGN_IMS_SID` in `apps/panda-realty/.env.local`
