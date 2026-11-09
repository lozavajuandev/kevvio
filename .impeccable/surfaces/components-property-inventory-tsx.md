---
version: 1
slug: "components-property-inventory-tsx"
primary_target: "components/property-inventory.tsx"
related_targets: ["components/photo-gallery.tsx", "components/workspace.tsx", "app/inventory.css"]
---

# Fotos e inventario

Modo: Operate. Propietario individual, escritorio y móvil. Extensión directa autorizada del expediente técnico de administración.

THESIS: Documentar cada inmueble por espacios, elementos y evidencia fotográfica, conservando sus cambios para consultas posteriores.

OWN-WORLD: Mantener la tipografía de sistema, verde profundo, superficies blancas, bordes suaves, estados escritos y controles existentes. `DESIGN.md` y `.impeccable/design.json` conservan la autoridad global; este contrato describe únicamente la nueva superficie.

STORY: Elegir inmueble, agregar fotos generales, crear espacios personalizables y registrar elementos individualmente o mediante «Agregar varios». Cada ficha reúne cantidad, estado, atributos libres, fotos e historial. Búsqueda, filtros y exportación CSV apoyan la consulta. Archivar conserva información y permite restaurarla; un inmueble archivado se consulta sin editar.

FORM: Galería antes del inventario. Escritorio combina navegación por espacios y tabla; en móvil los espacios se desplazan horizontalmente y los filtros se reorganizan. La ficha y captura rápida usan panel lateral; el visor fotográfico usa diálogo. Mantener nombres legibles, cantidades con unidad, foco visible y controles disponibles durante el desplazamiento.

IMAGERY: Las fotos son contenido privado aportado por el usuario. Los vacíos permanecen reales. Las imágenes sintéticas de revisión viven en directorios ignorados y no constituyen recursos raster distribuidos.

EVIDENCE: Capturas inspeccionadas en `.impeccable/review/`: `inventory-list-desktop-final.png`, `inventory-list-mobile-final.png`, `inventory-bulk-mobile-final.png` y `photo-viewer-mobile-final.png`. Confirman continuidad visual en listado, captura rápida y visor; las verificaciones funcionales corresponden a la revisión de implementación.
