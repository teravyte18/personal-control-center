"use client";

import Image from "next/image";
import { useState } from "react";

/** Private endpoints already resize/cache artwork and require the user's cookie. */
export function PrivateArtwork({ src, alt, fallback, landscape = false }: { src: string; alt: string; fallback: string; landscape?: boolean }) {
  return <ArtworkImage key={src} src={src} alt={alt} fallback={fallback} landscape={landscape} />;
}

function ArtworkImage({ src, alt, fallback, landscape }: { src: string; alt: string; fallback: string; landscape: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`pcc-cover pcc-artwork ${landscape ? "aspect-[4/3]" : "aspect-[2/3]"}`} aria-busy={Boolean(src && !failed && !loaded)}>
      {src && !failed
        ? <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 767px) 45vw, 220px" className="object-contain" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        : <span className="pcc-record-meta">{failed ? "Image unavailable" : fallback}</span>}
    </div>
  );
}
