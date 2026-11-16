// Panel de inicio: qué toca hoy, racha, próxima lección y progreso de cada ruta.

import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar'
import { content } from '../../content'
import { moduleProgress, nextLesson, routeProgress } from '../../content/graph'
import { useProgress } from '../../content/progress'
import { db } from '../../db/db'
import { useSettings } from '../../db/settings'
import { startOfStudyDay } from '../../lib/dates'
import { getDailyQueue } from '../../srs/queue'
import { computeStreak, reviewsToday, studyDays } from '../../stats/streak'

const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function weekdayOf(key: string): { short: string; long: string } {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  return {
    short: WEEKDAYS[date.getDay()],
    long: date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

export function HomePage() {
  const settings = useSettings()
  const progress = useProgress()

  const today = useLiveQuery(async () => {
    const now = new Date()
    const [queue, done, days, totalCards] = await Promise.all([
      getDailyQueue({ now, settings }),
      reviewsToday(startOfStudyDay(now, settings.dayStartHour)),
      studyDays(settings.dayStartHour),
      db.cards.count(),
    ])
    return { queue, done, totalCards, streak: computeStreak(days, now, settings.dayStartHour) }
  }, [settings.dayStartHour, settings.newCardsPerDay])

  if (!today || !progress) return <p className="muted">Cargando…</p>

  const { queue, done, streak, totalCards } = today
  const due = queue.counts.learning + queue.counts.review
  const pending = due + queue.counts.new
  const suggestions = content.routes
    .map((route) => ({ route, lesson: nextLesson(route, progress) }))
    .filter((s) => s.lesson)

  return (
    <section>
      <h1 className="sr-only">Inicio</h1>

      <div className="dashboard">
        {/* --- Repaso de hoy --- */}
        <section className="card-box stack" aria-labelledby="hoy">
          <h2 id="hoy">Repaso de hoy</h2>
          {totalCards === 0 ? (
            <p className="muted">
              Todavía no tenés tarjetas. Abrí una <Link to="/rutas">lección</Link> y agregá sus tarjetas sugeridas,
              o <Link to="/tarjetas/nueva">creá una</Link>.
            </p>
          ) : pending > 0 ? (
            <>
              <p className="big-number">
                {pending} <span className="small muted">{pending === 1 ? 'tarjeta pendiente' : 'tarjetas pendientes'}</span>
              </p>
              <p className="small">
                <span className="badge badge-due">{due} para repasar</span>{' '}
                <span className="badge badge-new">{queue.counts.new} nuevas</span>
              </p>
              <p>
                <Link to="/repasar" className="btn btn-primary">
                  Repasar ahora
                </Link>
              </p>
            </>
          ) : (
            <p>
              ✓ ¡Estás al día!
              {queue.laterToday > 0 && (
                <span className="muted"> Quedan {queue.laterToday} en aprendizaje para más tarde.</span>
              )}
            </p>
          )}
          {done > 0 && (
            <p className="small muted">
              Hoy repasaste {done} {done === 1 ? 'tarjeta' : 'tarjetas'}.
            </p>
          )}
        </section>

        {/* --- Racha --- */}
        <section className="card-box stack" aria-labelledby="racha">
          <h2 id="racha">Racha</h2>
          <p className="big-number">
            <span aria-hidden="true">🔥</span> {streak.current}{' '}
            <span className="small muted">{streak.current === 1 ? 'día seguido' : 'días seguidos'}</span>
          </p>
          <ol className="week" aria-label="Últimos 7 días">
            {streak.lastWeek.map((d) => {
              const w = weekdayOf(d.key)
              return (
                <li key={d.key} className={d.studied ? 'studied' : ''} title={w.long}>
                  <span className="dot" aria-hidden="true" />
                  <span className="small" aria-hidden="true">
                    {w.short}
                  </span>
                  <span className="sr-only">
                    {w.long}: {d.studied ? 'estudiaste' : 'sin actividad'}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="small muted">
            {streak.studiedToday
              ? 'Hoy ya sumaste un día. '
              : streak.current > 0
                ? 'Repasá o completá una lección hoy para mantenerla. '
                : 'Repasá o completá una lección para empezar una racha. '}
            Mejor racha: {streak.best} {streak.best === 1 ? 'día' : 'días'}.
          </p>
        </section>
      </div>

      {/* --- Próxima lección --- */}
      {suggestions.length > 0 && (
        <section className="card-box stack" aria-labelledby="proxima">
          <h2 id="proxima">Próxima lección sugerida</h2>
          {suggestions.map(({ route, lesson }) => (
            <div key={route.id}>
              <p className="small muted">{route.title}</p>
              <Link to={`/lecciones/${lesson!.id}`} className="btn btn-primary">
                {progress.get(lesson!.id) === 'seen' ? 'Continuar' : 'Empezar'}: {lesson!.title}
              </Link>
            </div>
          ))}
          <p className="small muted">
            Se sugiere la primera lección sin completar cuyos prerrequisitos ya completaste (si dejaste una
            empezada, esa primero).
          </p>
        </section>
      )}

      {/* --- Progreso de cada ruta --- */}
      <section aria-labelledby="progreso">
        <h2 id="progreso">Progreso</h2>
        {content.routes.map((route) => {
          const rp = routeProgress(route, progress)
          return (
            <div key={route.id} className="card-box stack">
              <h3>
                <Link to={`/rutas/${route.id}`}>{route.title}</Link>
              </h3>
              <ProgressBar percent={rp.percent} label={`Progreso de ${route.title}`} />
              <p className="small muted">
                {rp.completed} de {rp.total} lecciones completadas
                {rp.seen > 0 && ` · ${rp.seen} empezadas`}
              </p>
              <ul className="module-progress">
                {route.modules
                  .filter((m) => m.lessons.length > 0)
                  .map((m) => {
                    const mp = moduleProgress(m, progress)
                    return (
                      <li key={m.id}>
                        <span className="small">{m.title}</span>
                        <ProgressBar percent={mp.percent} label={`Progreso de ${m.title}`} />
                      </li>
                    )
                  })}
              </ul>
            </div>
          )
        })}
      </section>
    </section>
  )
}
