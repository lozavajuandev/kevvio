"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  SlidersHorizontal,
  Camera,
  Film,
  ClipboardList,
  Link2,
  MapPin,
  Save,
  LoaderCircle,
  Plus,
  FileText,
  FolderOpen,
  Archive,
  ArrowUpRight,
  Check,
} from "lucide-react";
import type { Snapshot, Property, PropertyInventoryData } from "@/lib/types";
import type { PropertyTab } from "./property-board";
import { api } from "@/lib/client-api";
import { PhotoGallery } from "./photo-gallery";
import PropertyInventory from "./property-inventory";
import ListingEditor from "./listing-editor";
import VideoStudio from "./video-studio";
type Action = {
  type: "lease" | "document" | "archive";
  propertyId?: string;
  item?: Property;
};
export default function PropertyWorkspace({
  property,
  data,
  tab,
  onTab,
  onBack,
  onChanged,
  onAction,
  onDirtyChange,
}: {
  property: Property;
  data: Snapshot;
  tab: PropertyTab;
  onTab: (tab: PropertyTab) => void;
  onBack: () => void;
  onChanged: () => Promise<unknown>;
  onAction: (action: Action) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [inventory, setInventory] = useState<PropertyInventoryData | null>(
      null,
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const d = await api("inventory/" + property.id);
    setInventory(d);
  }, [property.id]);
  useEffect(() => {
    let active = true;
    api("inventory/" + property.id)
      .then((d) => {
        if (active) setInventory(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      onDirtyChange(false);
    };
  }, [property.id, onDirtyChange]);
  async function photosChanged() {
    await load();
    await onChanged();
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(
        "properties/" + property.id,
        "PATCH",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      await onChanged();
      onDirtyChange(false);
      setNotice("Configuración guardada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const leases = data.leases.filter((l) => l.property_id === property.id),
    docs = data.documents.filter((d) => d.property_id === property.id);
  const rented = leases.some(
    (l) =>
      l.status === "active" &&
      l.start_date <= data.today &&
      l.end_date >= data.today,
  );
  return (
    <section className="property-workspace">
      <button className="back-to-properties" onClick={onBack}>
        <ArrowLeft size={17} /> Inmuebles
      </button>
      <header className="property-workspace-header">
        <div>
          <div className="property-title-line">
            <h1>{property.name}</h1>
            <span className={"badge " + (rented ? "green" : "neutral")}>
              <span />
              {property.archived_at
                ? "Archivado"
                : rented
                  ? "Arrendado"
                  : "Disponible"}
            </span>
          </div>
          <p>
            <MapPin size={15} />
            {property.address} · {property.city}
          </p>
        </div>
        {tab !== "listing" && !property.archived_at && (
          <button className="button primary" onClick={() => onTab("listing")}>
            <Link2 size={17} />
            {property.listing_enabled ? "Compartir anuncio" : "Crear anuncio"}
          </button>
        )}
      </header>
      <nav className="property-tabs" aria-label="Configuración del inmueble">
        {(
          [
            ["general", "Configuración", SlidersHorizontal],
            ["photos", "Fotos", Camera],
            ["videos", "Videos", Film],
            ["inventory", "Inventario", ClipboardList],
            ["listing", "Anuncio público", Link2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            aria-current={key === tab ? "page" : undefined}
            onClick={() => {
              setNotice("");
              onTab(key);
            }}
          >
            <Icon size={17} />
            {label}
            {key === "photos" && inventory && (
              <span>
                {
                  inventory.photos.filter(
                    (p) => !p.inventory_item_id && !p.archived_at,
                  ).length
                }
              </span>
            )}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="error">
          {error}
          <button
            className="text-button"
            onClick={() => {
              setError("");
              load().catch((e) => setError(e.message));
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="success-message">
          <Check size={17} />
          {notice}
        </div>
      )}
      {property.archived_at && (
        <div className="archive-notice">
          Este inmueble está archivado. Su anuncio público está desactivado
          mientras permanezca archivado.
        </div>
      )}
      {tab === "general" && (
        <div className="property-settings-layout">
          <form
            className="property-settings"
            onSubmit={save}
            onChange={() => {
              onDirtyChange(true);
              setNotice("");
            }}
          >
            <fieldset disabled={busy || !!property.archived_at}>
              <section className="editor-section">
                <h2>La información de tu inmueble</h2>
                <p>La base para organizarlo, arrendarlo y presentarlo.</p>
                <div className="form-grid">
                  <label className="field wide">
                    <span>Nombre del inmueble *</span>
                    <input
                      name="name"
                      required
                      maxLength={200}
                      defaultValue={property.name}
                    />
                  </label>
                  <label className="field">
                    <span>Tipo de inmueble *</span>
                    <select name="kind" defaultValue={property.kind}>
                      {[
                        "Apartamento",
                        "Casa",
                        "Local",
                        "Oficina",
                        "Bodega",
                        "Lote",
                        "Otro",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Ciudad *</span>
                    <input
                      name="city"
                      required
                      maxLength={200}
                      defaultValue={property.city}
                    />
                  </label>
                  <label className="field wide">
                    <span>Dirección *</span>
                    <input
                      name="address"
                      required
                      maxLength={200}
                      defaultValue={property.address}
                    />
                  </label>
                  <label className="field">
                    <span>Área (m²)</span>
                    <input
                      name="area"
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.01"
                      defaultValue={property.area}
                    />
                  </label>
                  <div className="form-grid">
                    <label className="field">
                      <span>Habitaciones</span>
                      <input
                        name="bedrooms"
                        type="number"
                        min="0"
                        max="999"
                        defaultValue={property.bedrooms}
                      />
                    </label>
                    <label className="field">
                      <span>Baños</span>
                      <input
                        name="bathrooms"
                        type="number"
                        min="0"
                        max="999"
                        defaultValue={property.bathrooms}
                      />
                    </label>
                  </div>
                </div>
              </section>
              <section className="editor-section">
                <h3>Solo para tu gestión</h3>
                <label className="field">
                  <span>Valor de adquisición (COP)</span>
                  <input
                    name="purchase_value"
                    type="number"
                    min="0"
                    max="9999999999999"
                    defaultValue={property.purchase_value}
                  />
                </label>
                <label className="field">
                  <span>Notas internas</span>
                  <textarea
                    rows={3}
                    name="notes"
                    defaultValue={property.notes}
                    maxLength={5000}
                    placeholder="Detalles que quieres tener a mano…"
                  />
                </label>
                <p className="muted">
                  Esta información nunca aparece en el anuncio público.
                </p>
              </section>
              <div className="settings-save">
                <button className="button primary" type="submit">
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}{" "}
                  Guardar cambios
                </button>
              </div>
            </fieldset>
          </form>
          <aside className="property-related">
            <section>
              <div className="section-line">
                <h3>
                  <FileText size={18} /> Contratos
                </h3>
                <button
                  className="icon-button"
                  disabled={!!property.archived_at}
                  onClick={() =>
                    onAction({ type: "lease", propertyId: property.id })
                  }
                  aria-label="Agregar contrato a este inmueble"
                >
                  <Plus size={18} />
                </button>
              </div>
              {leases.length ? (
                leases.map((l) => (
                  <div className="related-record" key={l.id}>
                    <strong>{l.tenant_name}</strong>
                    <span>
                      {l.status === "active" ? "Vigente" : "Finalizado"} ·{" "}
                      {l.start_date.slice(0, 10)} — {l.end_date.slice(0, 10)}
                    </span>
                  </div>
                ))
              ) : (
                <p>Aún no tienes contratos vinculados.</p>
              )}
            </section>
            <section>
              <div className="section-line">
                <h3>
                  <FolderOpen size={18} /> Documentos
                </h3>
                <button
                  className="icon-button"
                  disabled={!!property.archived_at}
                  onClick={() =>
                    onAction({ type: "document", propertyId: property.id })
                  }
                  aria-label="Agregar documento a este inmueble"
                >
                  <Plus size={18} />
                </button>
              </div>
              {docs.length ? (
                docs.map((d) => (
                  <a
                    className="related-record"
                    href={"/api/documents/" + d.id}
                    key={d.id}
                  >
                    <strong>
                      {d.title}
                      <ArrowUpRight size={14} />
                    </strong>
                    <span>{d.category}</span>
                  </a>
                ))
              ) : (
                <p>Guarda escrituras, pólizas y soportes aquí.</p>
              )}
            </section>
            {!property.archived_at && (
              <button
                className="text-button danger-text"
                onClick={() => onAction({ type: "archive", item: property })}
              >
                <Archive size={15} /> Archivar inmueble
              </button>
            )}
          </aside>
        </div>
      )}
      {tab === "photos" &&
        (inventory ? (
          <PhotoGallery
            propertyId={property.id}
            photos={inventory.photos}
            readonly={!!property.archived_at}
            onChanged={photosChanged}
          />
        ) : (
          !error && (
            <p className="inline-loading">
              <LoaderCircle size={18} className="spin" /> Cargando fotos…
            </p>
          )
        ))}
      {tab === "videos" && inventory && (
        <VideoStudio
          propertyId={property.id}
          photos={inventory.photos}
          readonly={!!property.archived_at}
          onPhotos={() => onTab("photos")}
          onDirtyChange={onDirtyChange}
        />
      )}
      {tab === "inventory" && (
        <PropertyInventory
          embedded
          properties={[property]}
          propertyId={property.id}
          onPropertyChange={() => {}}
          onChanged={onChanged}
          onCreateProperty={() => {}}
        />
      )}
      {tab === "listing" &&
        (inventory ? (
          <ListingEditor
            property={property}
            photos={inventory.photos}
            onChanged={onChanged}
            onPhotos={() => onTab("photos")}
            onDirtyChange={onDirtyChange}
          />
        ) : (
          !error && (
            <p className="inline-loading">
              <LoaderCircle size={18} className="spin" /> Cargando anuncio…
            </p>
          )
        ))}
    </section>
  );
}
