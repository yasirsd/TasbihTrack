# TLS certificate authorities

Save Supabase's public CA certificate here as **`supabase-ca.crt`** (PEM,
begins with `-----BEGIN CERTIFICATE-----`).

Download once from:

> Supabase Dashboard → your project → **Project Settings** → **Database** →
> **SSL Configuration** → **Download Certificate**

Then rename/copy the downloaded `prod-ca-*.crt` (or whatever the file is
called) to `certs/supabase-ca.crt`.

CA certificates are **public information** — safe to commit to the repo.

Alternative for hosts where committing files is inconvenient (e.g.
Vercel-only deployment): paste the PEM into the `SUPABASE_CA_CERT`
environment variable instead. Base64 encoding is also accepted.
