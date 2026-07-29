# DESIGN_SOURCES.md: the research library convention

This is the standing convention wiring the GameTev research library into this repo's design work. It was established for BOSS_DESIGN.md (2026-07-29) and applies to every design document after it.

## Where the library lives

D:\Programs\GameTev\research. Entry points: research/README.md (the domain index) and LIBRARY_SPEC.md (what the reports are, how they were built, and their fidelity rules). Reports live at research/<domain>/<report>/report.md.

## The citation rule

A claim taken from the library carries the report path and the section it came from, in the text, at the claim: research/<domain>/<report>/report.md plus a section number. No bare "the research says". Three disciplines ride along:

- Fidelity: cite what the section actually holds. If a rule is being widened (a music rule applied to mechanics, a campaign rule applied to phases inside one fight), say it is an analogy and whose mapping it is.
- Honest gaps: when the library holds nothing on a question, say so and mark the reasoning as house synthesis. An absence established by search is stated as an absence, never dressed up as an explicit gap row in a report.
- Authority caps: some reports cap their own authority (the single-room floor marks its 1A lessons as synthesis, not assertable fact). A capped source grounds judgment, never a gate, and the cap is disclosed where the source is leaned on.

Claims about this codebase are a separate rule and carry file:line actually read (or an explicit carried/UNVERIFIED label). The two rules together are the whole evidence system: every claim is either read code, a cited report section, or labelled house reasoning.

## The standing rule

Every future design doc in this repo consults the relevant domain reports before writing and cites them the way BOSS_DESIGN.md does. A design argument that could have been checked against a report and was not is treated as unverified. When a skeptic pass kills a citation, the fix goes into the text, not an errata list.

## Domains most relevant to this game

- game-systems: the experience ledgers and genre floors (Hades, Isaac, Slay the Spire, Vampire Survivors, Hollow Knight, and the floor reports). Reach for it when arguing what a run structure, boss, economy, or death model owes the player, or what canon games actually shipped.
- game-design: structure recipes (acts, chapters, journey shapes). Reach for it when deciding where a beat belongs in the night, what an act boundary owes, or what may be introduced late.
- audio: music tension and pacing. Reach for it for escalation triggers, plateau design, silence and release, stingers, and anything about when music should move.
- visual: readability, telegraph presentation, and style grounding. Reach for it when a mechanic's problem is that the player cannot see or parse it, before inventing UI.
- narrative: tone, spine, and story-delivery patterns. Reach for it when a mechanic needs to carry fiction, or a beat risks resolving what the house tone rules say must stay unresolved.

One report outside those domains is already live doctrine here: research/asset-forge/boss-encounter-recipes/report.md (arena fairness disc, spawn vocabulary, per-tier telegraph and recovery tables), cited by LEVEL_DESIGN.md section 3.8 and by BOSS_DESIGN.md. Treat it as binding the same way.
