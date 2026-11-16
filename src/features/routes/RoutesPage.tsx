// Lista de rutas de aprendizaje con su progreso.

import { Link } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar'
import { content } from '../../content'
import { nextLesson, routeProgress } from '../../content/graph'
import { useProgress } from '../../content/progress'

export function RoutesPage() {
  const progress = useProgress()

  return (
    <section>
      <h1>Rutas de aprendizaje</h1>
      {content.routes.length === 0 && <p className="muted">Todavía no hay rutas cargadas.</p>}
      <ul className="list">
        {content.routes.map((route) => {
          const summary = progress ? routeProgress(route, progress) : null
          const next = progress ? nextLesson(route, progress) : null
          return (
            <li key={route.id} className="card-box stack">
              <h2>
                <Link to={`/rutas/${route.id}`}>{route.title}</Link>
              </h2>
              <p className="muted">{route.description}</p>
              {summary && (
                <>
                  <ProgressBar percent={summary.percent} label={`Progreso de ${route.title}`} />
                  <p className="small muted">
                    {summary.completed} de {summary.total} lecciones completadas
                  </p>
                </>
              )}
              {next && (
                <p>
                  Próxima: <Link to={`/lecciones/${next.id}`}>{next.title}</Link>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
