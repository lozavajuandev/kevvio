---
version: 1
slug: components-workspace-tsx
primary_target: components/workspace.tsx
related_targets: [components/property-board.tsx, components/property-workspace.tsx, components/listing-editor.tsx, components/command-menu.tsx, components/property-wizard.tsx, components/people-workspace.tsx, components/video-studio.tsx, app/studio.css, app/growth.css]
---
# Property studio
Route: `/app`; `/` is the commercial landing. Legacy `vista`, `inmueble`, `seccion` and `crear` root queries redirect to `/app` with their values.

Mode: Operate. Full visual replacement requested. Spanish interface for rental property managers; local single-owner access remains. Direct construction was explicitly requested earlier, so no concept-selection interruption.

THESIS: One property is one workspace: configure it, photograph it, inspect its inventory, prepare a rental listing, and make videos without changing application sections.

OWN-WORLD: A rental presentation editor: photographic covers, generous white and pale-blue surfaces, deep-blue Manrope text, navy navigation, vivid orange primary actions and brand details, and quiet blue dividers. Brand expression lives in the property and in editing precision. No invented property photography or demo portfolio in the real database.

STORY: Open Inmuebles first. Find a property with search and availability filters. Open its workspace directly, switch between configuration, photos, inventory, listing and videos. New property creation opens the photo-first four-step wizard. Personas provides people, opportunities and follow-ups, including links to existing leases. An editor pairs explicit public fields with a live preview; saving a draft and publishing are separate operations. Share, deactivate or replace the URL from the same workspace.

FIRST VIEWPORT: 208px sidebar, 72px compact topbar with command search, a clear portfolio heading, one creation action and photo-led property cards. Empty portfolios provide one creation route. The property replaces the board in place; a back control and contextual tab row retain orientation. Mobile uses a hidden drawer and one-column property cards, then horizontally scrollable tabs. The small-screen listing editor offers an explicit preview toggle.

FORM: Direction seed bd75ac1d, assigned grounded candidate 6. Grounded candidates: 1 property portal grid; 2 rental availability calendar; 3 architectural contact sheet; 4 transaction ledger; 5 conversation-centered CRM; 6 rental presentation editor; 7 property archive. Candidate 6 connects private operations to public presentation with the clearest editing boundary. Grid specimen and cassette systems lose on product clarity and audience identification; their discipline is applied as consistent alignment and a single-property context, without decorative gridlines or cassette styling. The user-pinned modern, easy and fewer-clicks request is the visual authority. No generated image comps or stock imagery in the private workspace. The commercial landing has a separately attributed illustrative photograph.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, verdict, replacement DESIGN.md and token sidecar. Evidence must cover portfolio, creation wizard, Personas, property tabs, listing editor, video studio, public listing and mobile. Current documentation is source-grounded; no screenshots or visual approval are claimed. QA properties are explicitly test fixtures in a disposable database.
