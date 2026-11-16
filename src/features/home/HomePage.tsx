// Panel de inicio. Por ahora es una bienvenida; en la etapa 5 muestra
// tarjetas pendientes, racha, progreso y la próxima lección sugerida.

export function HomePage() {
  return (
    <section>
      <h1>Hola 👋</h1>
      <p>
        Esta es tu plataforma de estudio. Tus datos se guardan solo en este navegador: no hay
        cuentas ni servidores.
      </p>
      <p className="muted">El panel con tu progreso llega en la etapa 5.</p>
    </section>
  )
}
