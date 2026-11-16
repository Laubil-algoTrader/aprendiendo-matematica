// Pantalla provisoria para secciones que todavía no están implementadas.

export function Placeholder({ title, stage }: { title: string; stage: number }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">Esta sección llega en la etapa {stage}.</p>
    </section>
  )
}
