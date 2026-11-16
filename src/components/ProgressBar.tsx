// Barra de progreso accesible (los lectores de pantalla leen el porcentaje).

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="small muted">{percent}%</span>
    </div>
  )
}
