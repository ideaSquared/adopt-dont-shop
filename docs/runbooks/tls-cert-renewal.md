# TLS Certificate Renewal Failure

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none — certbot renews on a **silent** 12h loop
> (`--quiet`, no notification). A failing renewal is invisible until the cert
> actually expires and browsers reject the site. Treat "cert about to expire" as
> this runbook.

## Symptoms

- Browsers show `NET::ERR_CERT_DATE_INVALID` / an expired-certificate warning on
  the public site.
- `curl -vI https://${PROD_HOSTNAME}` reports an expired or soon-to-expire cert.
- The `ads_certbot` container is `exited` or logging renewal errors.

## Preconditions

The TLS edge is **not** in `docker-compose.prod.yml`. It's a separate shared
nginx + certbot living at **`/opt/ads/gateway/`** (`docker-compose.gateway.yml`,
containers `ads_gateway` and `ads_certbot`), joined to both the prod and staging
networks. nginx terminates TLS on 80/443 and reads certs from the shared
`letsencrypt` volume; certbot renews into that same volume via the webroot at
`/var/www/certbot`.

```bash
ssh deploy@$PROD_HOST
cd /opt/ads/gateway
export PROD_HOSTNAME=<the production hostname>
```

## Triage in 60 seconds

1. How long until the live cert expires?

   ```bash
   echo | openssl s_client -servername "$PROD_HOSTNAME" -connect "$PROD_HOSTNAME":443 2>/dev/null \
     | openssl x509 -noout -enddate
   ```

   Expected: `notAfter=` a date comfortably in the future. Inside ~10 days (Let's
   Encrypt certs are 90-day) and not renewing → act now.

2. What does certbot think it has?

   ```bash
   docker compose -f docker-compose.gateway.yml exec certbot certbot certificates
   ```

   Expected: the domain listed with a valid `Expiry Date` and `VALID: N days`. A
   missing cert or `INVALID: EXPIRED` is the problem.

## Diagnosis

1. Is certbot even running its loop?

   ```bash
   docker compose -f docker-compose.gateway.yml ps certbot
   docker compose -f docker-compose.gateway.yml logs --tail=100 --no-color certbot
   ```

   Expected: periodic `certbot renew` output every ~12h. Look for the failure
   reason:
   - `Timeout during connect` / HTTP-01 challenge fails → the ACME server can't
     reach `http://$PROD_HOSTNAME/.well-known/acme-challenge/...`. nginx isn't
     serving the webroot, or DNS / firewall on 80 is broken.
   - `too many certificates already issued` → Let's Encrypt rate limit; wait it
     out, don't loop `--force-renewal`.
   - No recent output at all → the container died; restart it.

2. Confirm nginx serves the ACME webroot on port 80 (the challenge path):

   ```bash
   curl -sI "http://$PROD_HOSTNAME/.well-known/acme-challenge/probe"
   ```

   Expected: a 404 from nginx (path served, file absent) — **not** a connection
   refused/timeout. Refused/timeout means port 80 or nginx is the problem, and
   HTTP-01 cannot succeed until that's fixed.

## Mitigation

1. **Run a renewal now and watch it** (drop the loop's `--quiet` so you see why):

   ```bash
   docker compose -f docker-compose.gateway.yml exec certbot \
     certbot renew --webroot -w /var/www/certbot
   ```

   Expected: `Congratulations, all renewals succeeded` or `Cert not yet due for
renewal` (nothing to do). A challenge failure prints the reason — fix it (port
   80 / DNS / nginx webroot) and re-run.

2. **Reload nginx to pick up the new cert.** The certbot loop renews but does
   **not** reload nginx, so a freshly renewed cert isn't served until you do:

   ```bash
   docker compose -f docker-compose.gateway.yml exec nginx nginx -t
   docker compose -f docker-compose.gateway.yml exec nginx nginx -s reload
   ```

   Expected: `nginx -t` → `syntax is ok` / `test is successful`; reload is silent.

3. **If certbot died**, restart it so the renewal loop resumes:

   ```bash
   docker compose -f docker-compose.gateway.yml up -d certbot
   ```

## Verify

- `openssl s_client … | openssl x509 -noout -enddate` (triage step 1) now shows
  a `notAfter` ~90 days out.
- Loading `https://${PROD_HOSTNAME}` in a browser shows no cert warning.
- `docker compose -f docker-compose.gateway.yml exec certbot certbot certificates`
  shows `VALID: 89 days` (or close).

## Rollback

Renewal is additive — a new cert replaces the old in the `letsencrypt` volume
and Let's Encrypt keeps the prior cert valid until its own expiry, so there is
nothing to undo. If a reload broke nginx config, `nginx -t` catches it before
reload; revert the config change and reload again.

## Escalate

If HTTP-01 keeps failing (port 80 unreachable, DNS wrong) or you hit the Let's
Encrypt rate limit with an already-expired cert, DM the secondary on-call — an
expired public cert is a full site-trust outage. Hand over the certbot log and
the challenge error.

## Capture

```bash
docker compose -f docker-compose.gateway.yml logs --since 24h --no-color certbot \
  > /tmp/tls-incident-$(date +%s).log
```

## Related

- [`maintenance-mode.md`](./maintenance-mode.md) — the hard-offline path also
  stops the edge nginx; don't confuse a planned stop with a cert failure.
