# Partner summaries, as Crewlu Cloud gives them to each partner

What `partner_view` answers as `status` for CrewLu's nine example summaries: `<example>.A.json` for partner A
(`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`) and `<example>.B.json` for partner B (`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`).

- **Copied from** Crewluve's `CrewluvTests/Fixtures/PartnerSummary/`, which makes them with Crewlu Cloud's own
  trimming (`private.trim_status_for`) from CrewLu's examples in `supabase/partner-status/examples/`.
- **When they change** there, copy them again.
- **The schedule:** one made-up pilot, Alex, at home in Atlanta (ATL) with base Louisville (SDF). Each file is one
  moment of the same week:
  - a jumpseat to Louisville;
  - trip Z55120: Louisville to Rockford, a turn, Rockford to Ontario, a night in Ontario, Ontario to Louisville;
  - a jumpseat home.
- **Partner A** sees the pilot as "Dad" in `display-names.A.json` and has their own "Call Me" in
  `quick-status-one-partner.A.json`.

`tests/partner/summary.test.ts` and `tests/partner/convert.test.ts` read them through `tests/fixtures/partner.ts`.
