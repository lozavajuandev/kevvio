"use client";
import BrandMark from "./brand-mark";
import { useRef, useState } from "react";
import {
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  MessageCircle,
  Check,
  Images,
} from "lucide-react";
import type { PublicListing } from "@/lib/listing-domain";
import { cop } from "./property-board";
export default function PublicListingView({
  listing,
  token,
  preview = false,
}: {
  listing: PublicListing;
  token?: string;
  preview?: boolean;
}) {
  const [index, setIndex] = useState(0),
    dialog = useRef<HTMLDialogElement>(null);
  const activeIndex = Math.min(index, Math.max(0, listing.photos.length - 1));
  const current = listing.photos[activeIndex];
  const src = (id: string) =>
    preview
      ? `/api/photos/${id}/file`
      : `/api/public/${token}/photos/${id}/file`;
  const whatsapp =
    "https://wa.me/" +
    listing.contact_phone.replace(/\D/g, "") +
    "?text=" +
    encodeURIComponent("Hola, me interesa el inmueble: " + listing.title);
  return (
    <div className={"public-listing " + (preview ? "is-preview" : "")}>
      {!preview && (
        <header className="public-brand">
          <span>
            <BrandMark size={23} /> kevvio<span className="brand-dot">.</span>
          </span>
          <span>Un espacio para tu próxima etapa.</span>
        </header>
      )}
      <div className="listing-gallery">
        <button
          className="listing-photo"
          disabled={!current}
          onClick={() => dialog.current?.showModal()}
          aria-label="Ampliar foto"
        >
          {current ? (
            <img src={src(current.id)} alt={current.caption || listing.title} />
          ) : (
            <span className="listing-photo-placeholder">
              <Images size={40} strokeWidth={1} />
              {preview
                ? "Selecciona las fotos de tu anuncio"
                : "No hay fotos disponibles"}
            </span>
          )}
        </button>
        {listing.photos.length > 1 && (
          <>
            <button
              className="gallery-arrow prev"
              aria-label="Foto anterior"
              onClick={() =>
                setIndex(
                  (activeIndex + listing.photos.length - 1) %
                    listing.photos.length,
                )
              }
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="gallery-arrow next"
              aria-label="Siguiente foto"
              onClick={() =>
                setIndex((activeIndex + 1) % listing.photos.length)
              }
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
        <span className="photo-counter">
          {current
            ? `${activeIndex + 1} / ${listing.photos.length}`
            : "Sin fotos"}
        </span>
      </div>
      <div className="public-content">
        <div className="public-description">
          <div className="listing-location">
            <MapPin size={16} />
            {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
          </div>
          <h1>{listing.title || "El título de tu anuncio"}</h1>
          <p className="public-kind">{listing.kind} en arriendo</p>
          <div className="public-specs">
            <span>
              <Maximize size={22} />
              <strong>{Number(listing.area).toLocaleString("es-CO")} m²</strong>
              <small>Área</small>
            </span>
            <span>
              <BedDouble size={23} />
              <strong>{listing.bedrooms}</strong>
              <small>Habitaciones</small>
            </span>
            <span>
              <Bath size={23} />
              <strong>{listing.bathrooms}</strong>
              <small>Baños</small>
            </span>
          </div>
          {listing.description && (
            <section>
              <h2>Acerca de este espacio</h2>
              <p className="listing-description-text">{listing.description}</p>
            </section>
          )}
          {listing.amenities.length > 0 && (
            <section>
              <h2>Lo que encontrarás</h2>
              <ul className="amenities-list">
                {listing.amenities.map((a) => (
                  <li key={a}>
                    <Check size={16} />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {listing.address && (
            <section>
              <h2>Ubicación</h2>
              <p>
                {listing.address} · {listing.city}
              </p>
            </section>
          )}
          {listing.available_from && (
            <p className="listing-availability">
              Disponible desde el{" "}
              {new Intl.DateTimeFormat("es-CO", {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(new Date(listing.available_from + "T12:00:00Z"))}
            </p>
          )}
        </div>
        <aside className="listing-contact">
          <p>Canon mensual</p>
          <div className="listing-price">
            {cop(listing.monthly_rent)}
            <small> COP / mes</small>
          </div>
          {listing.administration > 0 ? (
            <p>+ {cop(listing.administration)} de administración</p>
          ) : (
            <p>Administración sin costo adicional</p>
          )}
          <div className="contact-divider" />
          <h2>¿Te imaginas aquí?</h2>
          <p>
            {listing.contact_name
              ? `Habla con ${listing.contact_name} y coordina una visita.`
              : "Consulta los detalles y coordina una visita."}
          </p>
          {listing.contact_phone &&
            (preview ? (
              <button className="button primary" disabled>
                <MessageCircle size={18} /> Contactar por WhatsApp
              </button>
            ) : (
              <a
                className="button primary"
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} /> Contactar por WhatsApp{" "}
                <ArrowUpRight size={17} />
              </a>
            ))}
          {listing.contact_email &&
            (preview ? (
              <button className="button" disabled>
                <Mail size={17} /> Enviar correo
              </button>
            ) : (
              <a
                className="button"
                href={
                  "mailto:" +
                  listing.contact_email +
                  "?subject=" +
                  encodeURIComponent(listing.title)
                }
              >
                <Mail size={17} /> Enviar correo
              </a>
            ))}
        </aside>
      </div>
      {!preview && (
        <footer className="public-footer">
          Publicado con <strong>kevvio.</strong>
          <span>Información proporcionada por quien gestiona el inmueble.</span>
        </footer>
      )}
      <dialog
        ref={dialog}
        className="listing-lightbox"
        aria-label="Fotos del inmueble"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="lightbox-close"
          onClick={() => dialog.current?.close()}
          aria-label="Cerrar fotos"
        >
          <X size={24} />
        </button>
        {current && (
          <img src={src(current.id)} alt={current.caption || listing.title} />
        )}
        <div className="lightbox-controls">
          <button
            className="icon-button"
            aria-label="Foto anterior"
            disabled={listing.photos.length < 2}
            onClick={() =>
              setIndex(
                (activeIndex + listing.photos.length - 1) %
                  listing.photos.length,
              )
            }
          >
            <ChevronLeft />
          </button>
          <span>
            {activeIndex + 1} / {listing.photos.length}
          </span>
          <button
            className="icon-button"
            aria-label="Siguiente foto"
            disabled={listing.photos.length < 2}
            onClick={() => setIndex((activeIndex + 1) % listing.photos.length)}
          >
            <ChevronRight />
          </button>
        </div>
      </dialog>
    </div>
  );
}
