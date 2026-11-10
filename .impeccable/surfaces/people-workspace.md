# Personas y continuidad comercial
Route: Personas within `/app`. Sources: `components/people-workspace.tsx`, `components/workspace.tsx`, `lib/crm-domain.ts`, `app/growth.css`. Mode: Operate.

THESIS: A contact remains one person as interest develops into an opportunity, a visit and an existing rental relationship.
OWN-WORLD: Inherit the studio's Manrope, daylight blue surfaces, navy text and orange principal actions. Use monograms, explicit role labels, quiet dividers and readable rows; distinguish due follow-ups with a warm semantic text color.
STORY: Search people or filter by role; open a person; inspect contact details and existing leases; add opportunities, choose their stage and next contact; record conversations in a dated timeline. Switch the top segmented control between Personas, Oportunidades and Seguimientos. A single record may carry roles derived from its opportunities and leases.
FIRST VIEWPORT: Heading and creation action, segmented navigation, search, role filters and a table. The person detail uses a 285px contact column and flexible history with 48px gap. The opportunities board has six 235px columns with 16px gaps and horizontal scrolling. At <=760px the detail stacks; the 700px minimum table remains horizontally scrollable.
FORM: Source-led direct construction, authorized by the user. Stages are Nuevo, Contactado, Visita, Propuesta, Cerrado and Descartado. Stage changes use native select controls, not drag-and-drop. Conversations preserve text, type and date. Existing leases appear in the same person context.
FINISH: Source-grounded documentation only; no screenshots or visual approval. Later visual checks must cover empty people, mixed roles, long names, all six stages, due follow-ups and a populated timeline.
