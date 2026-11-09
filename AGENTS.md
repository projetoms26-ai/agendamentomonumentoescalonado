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
- Admin access = `admin` row in user_roles; the first account to open /admin claims it via claim_first_admin — bootstrap without manual DB edits.
- Keep cycle guidance in BookingInformation shared before and after registration as presentation only; it must not change eligibility or booking validation.
- Share the app logo through Brand and derive the browser favicon from the same image to keep identity consistent across pages.
