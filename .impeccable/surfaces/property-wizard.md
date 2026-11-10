# Creación de inmueble desde las fotos
Route: `/app?crear=inmueble`. Sources: `components/property-wizard.tsx`, `components/workspace.tsx`, `app/growth.css`. Mode: Operate.

THESIS: Start with the real property photos, then gather essential details and prepare a private listing draft in one guided sequence.
OWN-WORLD: Inherit Manrope, blue daylight surfaces, navy text and orange primary actions. Four numbered steps use an orange current circle; photo selection, helper panels and preview use the existing blue family and quiet borders.
STORY: Fotos → Datos → Descripción → Revisión. Select up to 12 JPG/PNG/WebP photos, reorder or remove them, enter the essentials, write manually or request a suggested description, review, then create the property. The first photo is the cover. Saving creates a private draft; it does not publish the listing. Returning to earlier steps is explicit.
FIRST VIEWPORT: Progress row above a flexible form and a 270–350px sticky preview, with a 56px gap. The first step is a dashed photo dropzone and ordered thumbnails; an empty photo set has an explicit continue-without-photos route. At <=760px the preview hides and the actions stay at the bottom of the viewport.
FORM: Source-led direct construction, authorized by the user, within the existing visual world. Step headings receive programmatic focus. Photo changes and entered data participate in the unsaved-work guard. An AI suggestion is displayed separately and must be applied; manual text remains available.
FINISH: Documentation is based on source only; no screenshots or visual approval are claimed. Verify full flow, validation, empty photos, disabled AI and responsive layout once a browser is available.

Current configuration reported by the parent: no OpenAI key is configured. The component queries service availability, disables generation when unavailable and retains manual editing. Do not describe generated text as already tested or available.
