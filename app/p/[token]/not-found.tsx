import BrandMark from "@/components/brand-mark";
export default function NotFound() {
  return (
    <main className="listing-unavailable">
      <BrandMark size={38} />
      <h1>Este anuncio ya no está disponible.</h1>
      <p>
        El enlace pudo vencer o el inmueble ya no se está ofreciendo. Solicita
        un enlace actualizado a la persona que te lo compartió.
      </p>
      <strong>kevvio.</strong>
    </main>
  );
}
