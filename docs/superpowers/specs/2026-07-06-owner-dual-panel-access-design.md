# Owner dual-panel access

## Goal

Allow one Supabase account to access both `/admin` and `/rental` without either
panel redirecting to the other. Preserve single-panel access for future admin
and rental staff accounts.

## Access model

Authorization remains based on the server-controlled
`user.app_metadata.role` claim:

| Role | `/admin` | `/rental` |
| --- | --- | --- |
| `owner` | allow | allow |
| `admin` | allow | deny |
| `rental` | deny | allow |
| missing or unknown | deny | deny |

Authentication and authorization failures remain inside the requested panel:
`/admin` redirects only to `/admin/login`, and `/rental` redirects only to
`/rental/login`. There are no cross-panel redirects.

## Implementation

Replace the rental-only predicate in `lib/rental/role.ts` with two pure access
predicates, `canAccessAdmin` and `canAccessRental`. Each panel layout uses its
matching predicate after loading the authenticated Supabase user.

The existing account must receive `app_metadata.role = "owner"` through the
Supabase Admin API. The user must sign out and back in afterward so the refreshed
JWT contains the new claim. The service-role key stays server-side and is never
added to the application or repository.

## Testing

Add a pure role test covering the complete matrix above, including null users
and unknown roles. Run the focused test first, followed by the project test and
build commands. Manual verification opens `/admin` and `/rental` using the same
freshly authenticated owner session and confirms the URL never crosses panels.
