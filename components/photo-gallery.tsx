"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  Upload,
  ImagePlus,
  X,
  Download,
  Star,
  Archive,
  RotateCcw,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/client-api";
import type { PropertyPhoto } from "@/lib/types";
export function PhotoGallery({
  propertyId,
  itemId = null,
  photos,
  readonly = false,
  onChanged,
  title = "Fotos del inmueble",
}: {
  propertyId: string;
  itemId?: string | null;
  photos: PropertyPhoto[];
  readonly?: boolean;
  onChanged: () => Promise<void>;
  title?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [archived, setArchived] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [confirmArchive, setConfirmArchive] = useState(false),
    [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();
  const photo = photos.find((p) => p.id === selected);
  useEffect(() => {
    if (photo) {
      dialog.current?.showModal();
      setConfirmArchive(false);
    } else dialog.current?.close();
  }, [selected]);
  const shown = photos.filter(
    (p) =>
      p.inventory_item_id === itemId &&
      (archived ? !!p.archived_at : !p.archived_at),
  );
  async function upload(input: HTMLInputElement) {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    setError("");
    setStatus("");
    if (
      files.length > 12 ||
      files.some((f) => f.size > 10 * 1024 * 1024) ||
      files.reduce((s, f) => s + f.size, 0) > 50 * 1024 * 1024
    ) {
      setError(
        "Selecciona hasta 12 fotos, máximo 10 MB por foto y 50 MB en total.",
      );
      input.value = "";
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("property_id", propertyId);
      if (itemId) form.set("inventory_item_id", itemId);
      files.forEach((f) => form.append("files", f));
      await api("photos", "POST", form);
      setStatus(
        `${files.length} ${files.length === 1 ? "foto guardada" : "fotos guardadas"}.`,
      );
      try {
        await onChanged();
      } catch {
        setError(
          "Las fotos quedaron guardadas. Recarga la página para verlas.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      input.value = "";
    }
  }
  async function update(
    values: { caption?: string; is_cover?: true; archived?: boolean },
    close = false,
  ) {
    if (!photo) return;
    setBusy(true);
    setError("");
    try {
      await api("photos/" + photo.id, "PATCH", values);
      if (values.archived === false) setArchived(false);
      if (close) setSelected(null);
      setStatus("Foto actualizada.");
      try {
        await onChanged();
      } catch {
        setError("El cambio quedó guardado. Recarga la página para verlo.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="photo-section">
      <div className="section-line">
        <h3>
          <Camera size={18} />
          {title}
          <span className="count-label">
            {
              photos.filter(
                (p) => p.inventory_item_id === itemId && !p.archived_at,
              ).length
            }
          </span>
        </h3>
        {!readonly && (
          <label className={"button photo-upload " + (busy ? "disabled" : "")}>
            <Upload size={15} />
            {busy ? "Procesando…" : "Agregar fotos"}
            <input
              className="sr-only"
              aria-label={"Agregar " + title.toLowerCase()}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy}
              onChange={(e) => upload(e.currentTarget)}
            />
          </label>
        )}
      </div>
      {error && !photo && (
        <p className="error" role="alert">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      {status && (
        <p className="photo-status" role="status">
          {status}
        </p>
      )}
      {shown.length ? (
        <div className="photo-grid">
          {shown.map((p) => (
            <button
              key={p.id}
              className="photo-tile"
              onClick={() => {
                setSelected(p.id);
                setError("");
              }}
              aria-label={"Ver foto: " + (p.caption || p.original_filename)}
            >
              <img
                src={"/api/photos/" + p.id + "/thumbnail"}
                alt={p.caption || p.original_filename}
                loading="lazy"
                width={p.width}
                height={p.height}
              />
              {p.is_cover && (
                <span className="photo-cover">
                  <Star size={11} />
                  Portada
                </span>
              )}
              <span className="photo-caption">
                {p.caption || p.original_filename}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="photo-empty">
          <ImagePlus size={27} strokeWidth={1.4} />
          <div>
            <strong>
              {archived
                ? "No hay fotos archivadas"
                : itemId
                  ? "Registra el estado de este elemento"
                  : "Un recorrido visual por tu inmueble"}
            </strong>
            <p>
              {archived
                ? "Las fotos que archives aparecerán aquí."
                : readonly
                  ? "Este registro todavía no tiene fotos."
                  : "Agrega vistas generales o detalles. JPG, PNG o WebP · 10 MB por foto."}
            </p>
          </div>
        </div>
      )}
      {photos.some((p) => p.inventory_item_id === itemId && p.archived_at) && (
        <label className="checkbox photo-archived">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Ver fotos archivadas
        </label>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={dialogTitleId}
        className="photo-viewer"
        onClose={() => setSelected(null)}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setSelected(null);
        }}
      >
        {photo && (
          <>
            <header>
              <h3 id={dialogTitleId}>
                {photo.caption || photo.original_filename}
              </h3>
              <button
                className="icon-button"
                aria-label="Cerrar foto"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                <X size={21} />
              </button>
            </header>
            <img
              className="photo-full"
              src={"/api/photos/" + photo.id + "/file"}
              alt={photo.caption || photo.original_filename}
              width={photo.width}
              height={photo.height}
            />
            <div className="photo-viewer-content">
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <form
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  update({
                    caption: String(
                      new FormData(e.currentTarget).get("caption") || "",
                    ),
                  });
                }}
              >
                <label className="field">
                  <span>Descripción de la foto</span>
                  <input
                    key={photo.id + photo.caption}
                    name="caption"
                    defaultValue={photo.caption}
                    maxLength={300}
                    placeholder="Ej. Fachada principal o fisura en lavamanos"
                    disabled={readonly || busy}
                  />
                </label>
                {!readonly && (
                  <button className="button" disabled={busy}>
                    Guardar descripción
                  </button>
                )}
              </form>
              <div className="photo-actions">
                <a
                  className="button"
                  href={"/api/photos/" + photo.id + "/file?download=1"}
                >
                  <Download size={15} />
                  Descargar
                </a>
                {!readonly &&
                  !photo.archived_at &&
                  !photo.inventory_item_id && (
                    <button
                      className="button"
                      disabled={busy || photo.is_cover}
                      onClick={() => update({ is_cover: true })}
                    >
                      <Star size={15} />
                      {photo.is_cover ? "Es la portada" : "Usar como portada"}
                    </button>
                  )}
                {!readonly &&
                  (photo.archived_at ? (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => update({ archived: false }, true)}
                    >
                      <RotateCcw size={15} />
                      Restaurar foto
                    </button>
                  ) : confirmArchive ? (
                    <>
                      <span>¿Archivar esta foto?</span>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => update({ archived: true }, true)}
                      >
                        Sí, archivar
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setConfirmArchive(false)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setConfirmArchive(true)}
                    >
                      <Archive size={15} />
                      Archivar
                    </button>
                  ))}
              </div>
              <small className="muted">
                {photo.width} × {photo.height} px · Foto optimizada. Las fotos
                archivadas se pueden restaurar.
              </small>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
