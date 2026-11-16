// Recursos externos de una lección.
//
// - Videos de YouTube: se embeben con el reproductor oficial en modo
//   "privacidad mejorada" (youtube-nocookie.com), que no guarda cookies
//   hasta que apretás play.
// - Todo lo demás: un enlace que se abre en otra pestaña, con la fuente visible.

import type { Resource, ResourceType } from '../types/content'

const TYPE_LABELS: Record<ResourceType, string> = {
  video: 'Video',
  articulo: 'Artículo',
  libro: 'Libro',
  ejercicios: 'Ejercicios',
  simulacion: 'Simulación',
  otro: 'Recurso',
}

const LANGUAGE_LABELS: Record<string, string> = { es: 'español', en: 'inglés', pt: 'portugués' }

/** Saca el id del video de una URL de YouTube (watch?v=, youtu.be/, embed/, shorts/). */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1)
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') ?? /^\/(?:embed|shorts|live)\/([^/]+)/.exec(u.pathname)?.[1] ?? null
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

function Meta({ resource }: { resource: Resource }) {
  const parts = [
    TYPE_LABELS[resource.type],
    resource.source,
    LANGUAGE_LABELS[resource.language] ?? resource.language,
    resource.durationMin ? `~${resource.durationMin} min` : null,
  ].filter(Boolean)
  return <p className="small muted resource-meta">{parts.join(' · ')}</p>
}

export function ResourceItem({ resource }: { resource: Resource }) {
  const videoId = resource.type === 'video' ? youtubeId(resource.url) : null
  if (videoId) {
    return (
      <li className="card-box resource">
        <h3>{resource.title}</h3>
        <Meta resource={resource} />
        <div className="video-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={`${resource.title} (${resource.source})`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <p className="small">
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            Ver en YouTube ↗
          </a>
        </p>
      </li>
    )
  }
  return (
    <li className="card-box resource">
      <h3>
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          {resource.title} ↗
        </a>
      </h3>
      <Meta resource={resource} />
    </li>
  )
}

export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="list">
      {resources.map((r) => (
        <ResourceItem key={r.url} resource={r} />
      ))}
    </ul>
  )
}
