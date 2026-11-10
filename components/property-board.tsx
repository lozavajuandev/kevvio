"use client";
import { useState } from "react";
import {
  Search,
  Plus,
  Building2,
  ArrowUpRight,
  MapPin,
  Camera,
  Link2,
  LayoutGrid,
  List,
  SlidersHorizontal,
  BedDouble,
  Bath,
  Maximize,
} from "lucide-react";
import type { Snapshot } from "@/lib/types";
export type PropertyTab = "general" | "photos" | "inventory" | "listing" | "videos";
export const cop = (n: number | string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n));
export default function PropertyBoard({
  data,
  onOpen,
  onCreate,
}: {
  data: Snapshot;
  onOpen: (id: string, tab?: PropertyTab) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [layout, setLayout] = useState("grid");
  const occupied = new Set(
    data.leases
      .filter(
        (l) =>
          l.status === "active" &&
          l.start_date <= data.today &&
          l.end_date >= data.today,
      )
      .map((l) => l.property_id),
  );
  const active = data.properties.filter((p) => !p.archived_at);
  const items = data.properties.filter(
    (p) =>
      (filter === "archived" ? !!p.archived_at : !p.archived_at) &&
      [p.name, p.city, p.address]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (filter !== "available" || !occupied.has(p.id)) &&
      (filter !== "leased" || occupied.has(p.id)) &&
      (filter !== "published" || p.listing_enabled),
  );
  return (
    <section className="property-board">
      <div className="studio-heading">
        <div>
          <h1>Un lugar para cada inmueble.</h1>
          <p>
            {active.length
              ? `${active.length} inmuebles · ${active.filter((p) => !occupied.has(p.id)).length} disponibles para un nuevo arriendo`
              : "Organiza tus espacios. Prepara tu próximo arriendo."}
          </p>
        </div>
        <button className="button primary" onClick={onCreate}>
          <Plus size={18} /> Nuevo inmueble
        </button>
      </div>
      <div className="board-controls">
        <div className="segmented" aria-label="Filtrar inmuebles">
          {[
            ["all", "Todos"],
            ["available", "Disponibles"],
            ["leased", "Arrendados"],
            ["published", "Anunciados"],
            ["archived", "Archivados"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="board-tools">
          <label className="search">
            <Search size={17} />
            <input
              placeholder="Buscar un inmueble…"
              aria-label="Buscar inmueble"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="layout-toggle">
            <button
              aria-label="Vista de tarjetas"
              aria-pressed={layout === "grid"}
              onClick={() => setLayout("grid")}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              aria-label="Vista de lista"
              aria-pressed={layout === "list"}
              onClick={() => setLayout("list")}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      {items.length ? (
        <div className={"studio-properties " + layout}>
          {items.map((p) => (
            <article className="studio-property" key={p.id}>
              <button
                className="property-open"
                onClick={() => onOpen(p.id)}
                aria-label={"Configurar " + p.name}
              >
                <div className="property-visual">
                  {p.cover_photo_id ? (
                    <img
                      src={"/api/photos/" + p.cover_photo_id + "/thumbnail"}
                      alt={p.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="property-no-photo">
                      <Building2 size={40} strokeWidth={1} />
                      <span>Tu inmueble, en imágenes</span>
                    </div>
                  )}
                  <span
                    className={
                      "property-status " +
                      (p.archived_at
                        ? "archived"
                        : occupied.has(p.id)
                          ? "leased"
                          : "available")
                    }
                  >
                    {p.archived_at
                      ? "Archivado"
                      : occupied.has(p.id)
                        ? "Arrendado"
                        : "Disponible"}
                  </span>
                  <span className="property-open-arrow">
                    <ArrowUpRight size={20} />
                  </span>
                </div>
                <div className="property-copy">
                  <span className="property-kind">{p.kind}</span>
                  <h2>{p.name}</h2>
                  <p>
                    <MapPin size={14} />
                    {p.city} · {p.address}
                  </p>
                  <div className="property-specs">
                    <span>
                      <Maximize size={14} />
                      {Number(p.area).toLocaleString("es-CO")} m²
                    </span>
                    <span>
                      <BedDouble size={15} />
                      {p.bedrooms} hab.
                    </span>
                    <span>
                      <Bath size={15} />
                      {p.bathrooms} baños
                    </span>
                  </div>
                </div>
              </button>
              <footer>
                <button onClick={() => onOpen(p.id, "photos")}>
                  <Camera size={16} /> Fotos
                </button>
                <button
                  onClick={() => onOpen(p.id, "listing")}
                  className={p.listing_enabled ? "published" : ""}
                >
                  <Link2 size={16} />
                  {p.listing_enabled ? "Anuncio activo" : "Crear anuncio"}
                </button>
                <button
                  className="icon-button"
                  onClick={() => onOpen(p.id)}
                  aria-label={"Configuración de " + p.name}
                >
                  <SlidersHorizontal size={16} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="portfolio-empty">
          <Building2 size={58} strokeWidth={1} />
          <h2>
            {active.length || search || filter !== "all"
              ? "No hay inmuebles en esta vista"
              : "Tu próximo arriendo empieza aquí"}
          </h2>
          <p>
            {active.length || search || filter !== "all"
              ? "Prueba otra búsqueda o cambia el filtro."
              : "Agrega un inmueble y reúne su información, fotos e inventario en un solo lugar."}
          </p>
          {!data.properties.length ? (
            <button className="button primary" onClick={onCreate}>
              <Plus size={17} /> Agregar mi primer inmueble
            </button>
          ) : (
            <button
              className="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Ver todos los inmuebles
            </button>
          )}
        </div>
      )}
    </section>
  );
}
