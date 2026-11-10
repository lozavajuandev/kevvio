import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicListing, listingOrigin } from "@/lib/listings";
import PublicListingView from "@/components/public-listing";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params,
    listing = await getPublicListing(token);
  return {
    title: listing
      ? listing.title + " · Kevvio"
      : "Anuncio no disponible · Kevvio",
    description:
      listing?.description.slice(0, 160) ||
      "Información del inmueble en arriendo.",
    robots: { index: false, follow: false },
    ...(listing && process.env.PUBLIC_APP_URL
      ? {
          openGraph: {
            siteName: "Kevvio",
            title: listing.title,
            description: listing.description.slice(0, 160),
            type: "website",
            url: listingOrigin("") + "/p/" + token,
            images: listing.photos[0]
              ? [
                  {
                    url:
                      listingOrigin("") +
                      "/api/public/" +
                      token +
                      "/photos/" +
                      listing.photos[0].id +
                      "/file",
                    width: listing.photos[0].width,
                    height: listing.photos[0].height,
                    alt: listing.photos[0].caption || listing.title,
                  },
                ]
              : [],
          },
        }
      : {}),
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params,
    listing = await getPublicListing(token);
  if (!listing) notFound();
  return <PublicListingView listing={listing} token={token} />;
}
