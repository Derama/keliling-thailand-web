# Creating a rental staff account

The `/rental` panel requires `app_metadata.role = "rental"` (server-set, in the JWT).

1. Supabase Dashboard → Authentication → Users → Add user (email + password).
2. Set the role via the Admin API (not editable by the user). With the service-role key:

   ```bash
   curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/<USER_ID>" \
     -H "apikey: $SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"app_metadata": {"role": "rental"}}'
   ```

3. Apply `docs/superpowers/sql/rental-schema.sql` in the SQL editor once.
4. Log in at `/rental/login`.

Tour admin accounts (`operation` / `marketing`) cannot access `/rental`, and rental
accounts cannot access `/admin` — each panel checks its own role.
