"use client";
import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight, Building2, X } from "lucide-react";
import type { Property } from "@/lib/types";
export default function CommandMenu({
  open,
  onClose,
  properties,
  sections,
  onProperty,
  onSection,
}: {
  open: boolean;
  onClose: () => void;
  properties: Property[];
  sections: readonly { id: string; label: string }[];
  onProperty: (id: string) => void;
  onSection: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (open) {
      setSearch("");
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open]);
  const match = (s: string) =>
    s.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"));
  const matches = properties
      .filter(
        (p) => !p.archived_at && match(p.name + " " + p.city + " " + p.address),
      )
      .slice(0, 8),
    routes = sections.filter((s) => match(s.label));
  return (
    <dialog
      ref={dialog}
      className="command-menu"
      aria-label="Buscar y navegar"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="command-search">
        <Search size={20} />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Busca un inmueble o una sección…"
          aria-label="Buscar en el portafolio"
        />
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
        >
          <X size={18} />
        </button>
      </div>
      <div className="command-results">
        {matches.length > 0 && (
          <>
            <p>Inmuebles</p>
            {matches.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onProperty(p.id);
                  onClose();
                }}
              >
                <Building2 size={18} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.city}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </>
        )}
        {routes.length > 0 && (
          <>
            <p>Ir a</p>
            {routes.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSection(s.id);
                  onClose();
                }}
              >
                <span>{s.label}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </>
        )}
        {!matches.length && !routes.length && (
          <p>No encontramos resultados. Prueba otro nombre.</p>
        )}
      </div>
      <footer>Usa Tab para moverte y Enter para abrir. Esc para cerrar.</footer>
    </dialog>
  );
}
