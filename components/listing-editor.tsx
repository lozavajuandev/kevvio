"use client";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  Link2,
  LoaderCircle,
  RotateCw,
  Save,
  Send,
  Star,
  Camera,
} from "lucide-react";
import { api } from "@/lib/client-api";
import {
  amenityOptions,
  type ListingDraft,
  type ListingState,
  type PublicListing,
} from "@/lib/listing-domain";
import type { Property, PropertyPhoto } from "@/lib/types";
import PublicListingView from "./public-listing";
export default function ListingEditor({
  property,
  photos,
  onChanged,
  onPhotos,
  onDirtyChange,
}: {
  property: Property;
  photos: PropertyPhoto[];
  onChanged: () => Promise<unknown>;
  onPhotos: () => void;
  onDirtyChange: (value: boolean) => void;
}) {
  const [state, setState] = useState<ListingState | null>(null),
    [draft, setDraft] = useState<ListingDraft | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<"disable" | "rotate" | null>(null),
    [preview, setPreview] = useState(false);
  useEffect(() => {
    let alive = true;
    api("listings/" + property.id)
      .then((s) => {
        if (alive) {
          setState(s);
          setDraft(s.draft);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [property.id]);
  const dirty =
    !!draft && !!state && JSON.stringify(draft) !== JSON.stringify(state.draft);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  function change<K extends keyof ListingDraft>(
    key: K,
    value: ListingDraft[K],
  ) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setNotice("");
  }
  async function save(action: "draft" | "publish" | "disable" | "rotate") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await api(
        `listings/${property.id}/${action}`,
        "POST",
        ["draft", "publish"].includes(action) ? draft : {},
      );
      setState(next);
      if (action === "draft" || action === "publish") setDraft(next.draft);
      setConfirm(null);
      setNotice(
        action === "publish"
          ? "Anuncio publicado. El enlace muestra esta versión."
          : action === "draft"
            ? "Borrador guardado. El anuncio publicado conserva su versión anterior."
            : action === "disable"
              ? "Enlace desactivado."
              : "Nuevo enlace creado. El anterior ya no funciona.",
      );
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!draft || !state)
    return error ? (
      <div className="error" role="alert">
        {error}
        <button className="button" onClick={() => location.reload()}>
          Reintentar
        </button>
      </div>
    ) : (
      <p className="inline-loading">
        <LoaderCircle size={18} className="spin" /> Preparando el anuncio…
      </p>
    );
  const available = photos.filter(
    (p) => !p.inventory_item_id && !p.archived_at,
  );
  const missing = draft.photo_ids.filter(
    (id) => !available.some((p) => p.id === id),
  );
  const expired =
    !!state.expires_on &&
    state.expires_on <
      new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(
        new Date(),
      );
  const live = state.enabled && !expired && !property.archived_at;
  const previewListing: PublicListing = {
    ...draft,
    kind: property.kind,
    city: property.city,
    address: draft.show_address ? property.address : null,
    area: property.area,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    photos: draft.photo_ids
      .map((id) => available.find((p) => p.id === id))
      .filter((p): p is PropertyPhoto => !!p),
  };
  return (
    <div className="listing-editor">
      <div className="listing-editor-heading">
        <div>
          <h2>Un buen anuncio abre puertas.</h2>
          <p>
            Prepara la información que verá una persona interesada en arrendar.
          </p>
        </div>
        <button
          className="button preview-toggle"
          onClick={() => setPreview(!preview)}
        >
          <Eye size={17} />
          {preview ? "Volver al editor" : "Vista previa"}
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      <div className="listing-publication">
        <div>
          <span className={"badge " + (live ? "green" : "neutral")}>
            <span />
            {live
              ? "Publicado"
              : expired && state.enabled
                ? "Enlace vencido"
                : "Sin publicar"}
          </span>
          <p>
            {live
              ? dirty || state.has_unpublished_changes
                ? "Tienes cambios pendientes de publicar."
                : "Tu anuncio está actualizado."
              : "Tú decides cuándo activar el enlace."}
          </p>
        </div>
        {state.published_at && (
          <div className="publication-actions">
            {live && (
              <>
                <a
                  className="button"
                  href={state.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={16} />
                  {state.local_only ? "Abrir vista local" : "Abrir anuncio"}
                </a>
                <button
                  className="button"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(state.url);
                      setNotice(
                        state.local_only
                          ? "Enlace copiado. Por ahora solo funciona en este Mac."
                          : "Enlace copiado.",
                      );
                    } catch {
                      setError(
                        "No se pudo copiar. Selecciona el enlace que aparece abajo y cópialo.",
                      );
                    }
                  }}
                >
                  <Copy size={16} /> Copiar enlace
                </button>
              </>
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setConfirm(state.enabled ? "disable" : "rotate")}
            >
              {state.enabled ? "Desactivar" : "Reemplazar enlace"}
            </button>
            {live && (
              <button
                className="icon-button"
                aria-label="Reemplazar enlace"
                disabled={busy}
                onClick={() => setConfirm("rotate")}
              >
                <RotateCw size={17} />
              </button>
            )}
          </div>
        )}
      </div>
      {state.published_at && (
        <label className="listing-url">
          <Link2 size={16} />
          <input
            readOnly
            aria-label="Enlace del anuncio"
            value={state.url}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      {state.local_only && (
        <p className="local-link-note">
          Vista local: el enlace funciona en este Mac. Para compartirlo con
          otras personas, primero conecta la aplicación a un hosting.
        </p>
      )}
      {confirm && (
        <div className="inline-confirm" role="alert">
          <p>
            {confirm === "disable"
              ? "El enlace dejará de mostrar el anuncio. Puedes publicarlo de nuevo cuando quieras."
              : "El enlace anterior dejará de funcionar. Tendrás que compartir el nuevo enlace."}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => setConfirm(null)}
          >
            Cancelar
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => save(confirm)}
          >
            {confirm === "disable" ? "Desactivar enlace" : "Crear nuevo enlace"}
          </button>
        </div>
      )}
      <div
        className={"listing-editor-layout " + (preview ? "show-preview" : "")}
      >
        <form
          className="listing-form"
          onSubmit={(e) => {
            e.preventDefault();
            save("publish");
          }}
        >
          <fieldset disabled={busy || !!property.archived_at}>
            <section className="editor-section">
              <h3>Lo primero que verán</h3>
              <label className="field">
                <span>Título del anuncio *</span>
                <input
                  value={draft.title}
                  maxLength={160}
                  required
                  placeholder="Un apartamento con espacio para tu próxima etapa"
                  onChange={(e) => change("title", e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Canon mensual (COP) *</span>
                  <input
                    type="number"
                    min="1"
                    max="9999999999999"
                    required
                    value={draft.monthly_rent || ""}
                    onChange={(e) =>
                      change("monthly_rent", Number(e.target.value))
                    }
                    placeholder="0"
                  />
                </label>
                <label className="field">
                  <span>Administración (COP)</span>
                  <input
                    type="number"
                    min="0"
                    max="9999999999999"
                    value={draft.administration}
                    onChange={(e) =>
                      change("administration", Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span>Barrio o sector</span>
                <input
                  value={draft.neighborhood}
                  maxLength={120}
                  onChange={(e) => change("neighborhood", e.target.value)}
                  placeholder="Ej. Cedritos"
                />
              </label>
              <label className="field">
                <span>Descripción</span>
                <textarea
                  rows={5}
                  value={draft.description}
                  maxLength={5000}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Describe la luz, la distribución y lo que hace especial este espacio."
                />
              </label>
            </section>
            <section className="editor-section">
              <div className="section-line">
                <h3>Fotos del anuncio</h3>
                <button
                  type="button"
                  className="text-button"
                  onClick={onPhotos}
                >
                  <Camera size={15} /> Gestionar fotos
                </button>
              </div>
              <p>
                Elige las fotos que quieres compartir. La primera será la
                portada del anuncio.
              </p>
              {missing.length > 0 && (
                <div className="error" role="alert">
                  Hay fotos archivadas en el borrador.
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      change(
                        "photo_ids",
                        draft.photo_ids.filter((id) => !missing.includes(id)),
                      )
                    }
                  >
                    Quitarlas del anuncio
                  </button>
                </div>
              )}
              {available.length ? (
                <div className="listing-photo-picker">
                  {available.map((p) => {
                    const position = draft.photo_ids.indexOf(p.id);
                    return (
                      <div
                        key={p.id}
                        className={position >= 0 ? "selected" : ""}
                      >
                        <button
                          type="button"
                          aria-label={
                            (position >= 0 ? "Quitar " : "Incluir ") +
                            (p.caption || p.original_filename)
                          }
                          aria-pressed={position >= 0}
                          onClick={() =>
                            change(
                              "photo_ids",
                              position >= 0
                                ? draft.photo_ids.filter((id) => id !== p.id)
                                : [...draft.photo_ids, p.id],
                            )
                          }
                        >
                          <img
                            src={"/api/photos/" + p.id + "/thumbnail"}
                            alt={p.caption || p.original_filename}
                          />
                          <span>
                            {position >= 0 ? <Check size={14} /> : <PlusIcon />}
                            {position === 0
                              ? "Portada"
                              : position > 0
                                ? position + 1
                                : "Incluir"}
                          </span>
                        </button>
                        {position > 0 && (
                          <button
                            className="photo-set-cover"
                            type="button"
                            aria-label={
                              "Usar como portada: " +
                              (p.caption || p.original_filename)
                            }
                            onClick={() =>
                              change("photo_ids", [
                                p.id,
                                ...draft.photo_ids.filter((id) => id !== p.id),
                              ])
                            }
                          >
                            <Star size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  className="listing-upload-prompt"
                  onClick={onPhotos}
                >
                  <Camera size={25} /> Agrega fotos al inmueble para empezar
                </button>
              )}
            </section>
            <section className="editor-section">
              <h3>Lo que ofrece</h3>
              <div className="amenity-picker">
                {amenityOptions.map((a) => (
                  <label key={a}>
                    <input
                      type="checkbox"
                      checked={draft.amenities.includes(a)}
                      onChange={(e) =>
                        change(
                          "amenities",
                          e.target.checked
                            ? [...draft.amenities, a]
                            : draft.amenities.filter((v) => v !== a),
                        )
                      }
                    />
                    {a}
                  </label>
                ))}
              </div>
            </section>
            <section className="editor-section">
              <h3>Cómo pueden contactarte</h3>
              <p>
                Publica al menos un teléfono o correo. Estos datos serán
                visibles en el anuncio.
              </p>
              <label className="field">
                <span>Nombre de contacto</span>
                <input
                  value={draft.contact_name}
                  maxLength={120}
                  onChange={(e) => change("contact_name", e.target.value)}
                  autoComplete="name"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>WhatsApp con indicativo</span>
                  <input
                    type="tel"
                    value={draft.contact_phone}
                    maxLength={16}
                    pattern="\+?[0-9]{7,15}"
                    placeholder="+573001234567"
                    onChange={(e) => change("contact_phone", e.target.value)}
                    autoComplete="tel"
                  />
                </label>
                <label className="field">
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    value={draft.contact_email}
                    maxLength={254}
                    onChange={(e) => change("contact_email", e.target.value)}
                    autoComplete="email"
                  />
                </label>
              </div>
            </section>
            <details className="editor-section">
              <summary>Disponibilidad y privacidad</summary>
              <div className="form-grid">
                <label className="field">
                  <span>Disponible desde</span>
                  <input
                    type="date"
                    value={draft.available_from || ""}
                    min="1900-01-01"
                    max="2200-12-31"
                    onChange={(e) =>
                      change("available_from", e.target.value || null)
                    }
                  />
                </label>
                <label className="field">
                  <span>Vencimiento del enlace</span>
                  <input
                    type="date"
                    value={draft.expires_on || ""}
                    min="1900-01-01"
                    max="2200-12-31"
                    onChange={(e) =>
                      change("expires_on", e.target.value || null)
                    }
                  />
                  <small>
                    Vacío para mantenerlo activo hasta desactivarlo.
                  </small>
                </label>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={draft.show_address}
                  onChange={(e) => change("show_address", e.target.checked)}
                />{" "}
                Mostrar dirección exacta
              </label>
              <p className="muted">
                Los contratos, pagos, documentos, notas internas e inventario
                nunca se incluyen en este anuncio.
              </p>
            </details>
            <div className="listing-save-bar">
              <span>
                {busy
                  ? "Guardando…"
                  : dirty
                    ? "Cambios sin guardar"
                    : "Borrador al día"}
              </span>
              <button
                type="button"
                className="button"
                onClick={() => save("draft")}
              >
                <Save size={16} /> Guardar borrador
              </button>
              <button type="submit" className="button primary">
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Send size={16} />
                )}{" "}
                {live ? "Actualizar anuncio" : "Publicar anuncio"}
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="listing-preview">
          <div className="preview-heading">
            <Eye size={16} /> Así verán tu anuncio<span>Vista previa</span>
          </div>
          <PublicListingView listing={previewListing} preview />
        </aside>
      </div>
    </div>
  );
}
function PlusIcon() {
  return <span aria-hidden="true">+</span>;
}
