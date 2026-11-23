<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public booking and availability go only through security-definer RPCs, including get_schedule and book_cycles — keeps customer data private and serializes capacity checks with an advisory lock per date.
- Publish and edit capacity in schedule_periods keyed by date and period; public booking uses book_periods with explicit matching date/period arrays and per-date locks, so simultaneous periods have independent balances. schedule_days remains legacy-only.
- Public booking RPC book_periods requires a confirmed (admin-approved) registration, then delegates to book_periods_core for capacity checks — approval gates booking per user request.
- Admin access requires an existing `admin` row in user_roles; claim_first_admin only checks that role — open customer signup must never bootstrap administrators.
- Keep cycle guidance in BookingInformation shared before and after registration as presentation only; it must not change eligibility or booking validation.
- Render the creator signature in the shared root footer so it stays consistent across the site.
- Share the app logo through Brand and derive the browser favicon from the same image to keep identity consistent across pages.
- Link customer accounts by auth_user_id through signup/confirmation triggers and authenticated identity RPCs; legacy records link only after verified, unique email matching — a phone number is not a credential.
- Preserve account profile creation in an Auth lifecycle trigger; customer registration metadata creates pending records but never grants approval or roles.
- WhatsApp approval links are manual sends after saved approval; do not report them as automatic delivery.
- Attendance history is append-only trigger-generated snapshots, read through an identity-scoped RPC; durations are actual admin input and unknown legacy values stay null so past records are not invented or overwritten.
- All email signup screens use a shared existence-check wrapper backed by a boolean-only security-definer RPC across Auth and customers, including pending accounts; this prevents misleading duplicate signup success without exposing customer details.
- Grant and list administrator contacts only through admin-checked RPCs; grants require a verified existing Auth account, preventing public signup from granting privileges.
- Customer signup checks phone existence through a boolean-only RPC before Auth signup; keep the lifecycle trigger as the authoritative duplicate guard and never overwrite an existing customer.
- Home-screen installation uses a manifest and logo-derived icons only; do not add app-shell service workers or offline caches without an explicit offline request, so live availability, authentication and integrations remain unchanged.
