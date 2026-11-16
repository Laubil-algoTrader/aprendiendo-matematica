// Una ruta: sus módulos, sus lecciones y el estado de cada una.

import { Link, useParams } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar'
import { getRoute } from '../../content'
import { isUnlocked, moduleProgress, nextLesson, routeProgress, type ProgressMap } from '../../content/graph'
import { useProgress } from '../../content/progress'
import type { Lesson } from '../../types/content'

/** Ícono + texto del estado (el texto lo leen los lectores de pantalla). */
export function lessonStatus(lesson: Lesson, progress: ProgressMap) {
  const status = progress.get(lesson.id)
  if (status === 'completed') return { icon: '✓', label: 'Completada', kind: 'done' }
  if (status === 'seen') return { icon: '◐', label: 'Empezada', kind: 'seen' }
  if (!isUnlocked(lesson, progress)) return { icon: '🔒', label: 'Faltan prerrequisitos', kind: 'locked' }
  return { icon: '○', label: 'Disponible', kind: 'open' }
}

export function RoutePage() {
  const { routeId } = useParams()
  const route = routeId ? getRoute(routeId) : undefined
  const progress = useProgress()

  if (!route) {
    return (
      <section>
        <h1>Ruta no encontrada</h1>
        <Link to="/rutas">Ver todas las rutas</Link>
      </section>
    )
  }
  if (!progress) return <p className="muted">Cargando…</p>

  const summary = routeProgress(route, progress)
  const next = nextLesson(route, progress)

  return (
    <section>
      <p>
        <Link to="/rutas">← Rutas</Link>
      </p>
      <h1>{route.title}</h1>
      <p className="muted">{route.description}</p>
      <ProgressBar percent={summary.percent} label={`Progreso de ${route.title}`} />
      {next && (
        <p>
          <Link to={`/lecciones/${next.id}`} className="btn btn-primary">
            Continuar: {next.title}
          </Link>
        </p>
      )}

      {route.modules.map((module) => {
        const mp = moduleProgress(module, progress)
        return (
          <section key={module.id} className="card-box stack" aria-labelledby={`mod-${module.id}`}>
            <h2 id={`mod-${module.id}`}>{module.title}</h2>
            {module.description && <p className="muted">{module.description}</p>}
            {module.lessons.length === 0 ? (
              <p className="badge badge-muted">Próximamente</p>
            ) : (
              <>
                <ProgressBar percent={mp.percent} label={`Progreso de ${module.title}`} />
                <ol className="lesson-list">
                  {module.lessons.map((lesson) => {
                    const st = lessonStatus(lesson, progress)
                    return (
                      <li key={lesson.id} className={`lesson-item lesson-${st.kind}`}>
                        <span className="lesson-icon" aria-hidden="true">
                          {st.icon}
                        </span>
                        <Link to={`/lecciones/${lesson.id}`}>{lesson.title}</Link>
                        <span className="small muted">{st.label}</span>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
          </section>
        )
      })}
    </section>
  )
}
