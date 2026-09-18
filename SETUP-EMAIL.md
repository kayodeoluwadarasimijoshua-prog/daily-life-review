# Enable real confirmation emails (Brevo → Supabase)

Free forever: **300 emails/day (~9,000/month)**. No credit card. No domain needed.

Total time: ~5 minutes.

---

## Why this is needed

Supabase's built-in mailer:

- sends only **2 messages per hour**, and
- **refuses to deliver to anyone who isn't a member of your Supabase team**
  (fails with *"Email address not authorized"*).

So today, nobody except you can sign up. Custom SMTP fixes both.

---

## Step 1 — Create a Brevo account

1. Go to **https://www.brevo.com** → **Sign up free**
2. Use your normal email address (Gmail is fine)
3. Confirm your own email address when Brevo asks
4. When asked what you want to do, choose anything — it doesn't affect SMTP

> Brevo may ask a couple of onboarding questions about company/website.
> Answer loosely; a personal project is fine.

---

## Step 2 — Get your SMTP credentials

1. In Brevo, click your **name (top right)** → **SMTP & API**
   (or go straight to https://app.brevo.com/settings/keys/smtp)
2. Open the **SMTP** tab
3. Click **Generate a new SMTP key**, name it `supabase`
4. Copy these four values:

   | Field | Value |
   |---|---|
   | **SMTP server** | `smtp-relay.brevo.com` |
   | **Port** | `587` |
   | **Login** | the email shown on that page (your Brevo account email) |
   | **Password** | the **SMTP key** you just generated |

> ⚠️ Copy the SMTP key now — Brevo only shows it once.
> It is NOT your Brevo password, and NOT the "API key" on the other tab.

---

## Step 3 — Verify a sender address

Brevo will only send *from* an address it has verified.

1. Go to **Senders, Domains & Dedicated IPs** → **Senders**
   (https://app.brevo.com/senders/list)
2. Click **Add a sender**
3. Name: `Daily Life Review`
   Email: your own email address
4. Brevo emails you a confirmation link — click it

That address is what your users will see in the "From" field.

---

## Step 4 — Plug it into Supabase

1. Open https://supabase.com/dashboard/project/psrtldsdxgcdvjavdqdg/auth/smtp
2. Turn on **Enable Custom SMTP**
3. Fill in:

   | Field | Value |
   |---|---|
   | Sender email | the address you verified in Step 3 |
   | Sender name | `Daily Life Review` |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | your Brevo account email |
   | Password | the Brevo **SMTP key** |

4. Click **Save**

---

## Step 5 — Raise the Supabase rate limit

Supabase drops to a cautious 30/hour the moment custom SMTP is enabled.

1. Go to https://supabase.com/dashboard/project/psrtldsdxgcdvjavdqdg/auth/rate-limits
2. Set **"Rate limit for sending emails"** to `100` per hour
   (comfortably inside Brevo's 300/day)
3. Save

---

## Step 6 — Check the redirect URLs

Confirmation links only work if these are allowed.

Go to https://supabase.com/dashboard/project/psrtldsdxgcdvjavdqdg/auth/url-configuration

- **Site URL:** `https://daily-life-review.vercel.app`
- **Redirect URLs** must include:
  - `https://daily-life-review.vercel.app/api/auth/callback`
  - `https://daily-life-review.vercel.app/**`

---

## Step 7 — Test it

1. Open https://daily-life-review.vercel.app/signup
2. Sign up with a **real** address (not `example.com` — Supabase rejects
   undeliverable domains)
3. You should see the **"Check your inbox ✉️"** screen
4. Click the link in the email → you land signed in on the dashboard

If the email doesn't arrive, check spam, then Brevo's
**Transactional → Email → Logs** page — it shows every send attempt
and the exact reason for any failure.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| *Email address not authorized* | Custom SMTP not actually enabled — recheck Step 4 |
| *Email rate limit exceeded* | Step 5 not done, or Brevo's 300/day hit |
| Email lands in spam | Expected without your own domain. Add a domain + DKIM in Brevo later to fix properly. |
| *That link is invalid or has expired* | Step 6 redirect URLs wrong, or the link was already used |
| Nothing in Brevo logs | Supabase never sent it — credentials wrong (using Brevo password instead of SMTP key is the usual cause) |

---

## Later: sending from your own domain

Gmail-as-sender works, but deliverability improves a lot with a domain.
In Brevo: **Senders, Domains & Dedicated IPs → Domains → Add a domain**,
then add the DKIM/SPF DNS records it gives you. Nothing in Supabase or the
app needs to change except the sender address.
