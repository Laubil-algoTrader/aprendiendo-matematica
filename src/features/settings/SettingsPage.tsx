// Pantalla de ajustes: límite de tarjetas nuevas, hora de corte del día, tema
// y copia de seguridad (backup) de todos tus datos.

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { updateSettings, useSettings } from '../../db/settings'
import { backupSummary, downloadText, exportBackup, parseBackup, restoreBackup, serializeBackup } from '../../lib/backup'
import type { ThemePreference } from '../../types/user-data'

export function SettingsPage() {
  const settings = useSettings()

  // Copia local editable del formulario; se sincroniza cuando cambian los ajustes guardados.
  const [newCardsPerDay, setNewCardsPerDay] = useState(String(settings.newCardsPerDay))
  const [dayStartHour, setDayStartHour] = useState(String(settings.dayStartHour))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setNewCardsPerDay(String(settings.newCardsPerDay))
    setDayStartHour(String(settings.dayStartHour))
  }, [settings.newCardsPerDay, settings.dayStartHour])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await updateSettings({
        newCardsPerDay: Number(newCardsPerDay),
        dayStartHour: Number(dayStartHour),
      })
      setMessage({ kind: 'ok', text: 'Ajustes guardados.' })
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    }
  }

  // El tema se guarda apenas se elige, sin botón.
  async function handleTheme(theme: ThemePreference) {
    await updateSettings({ theme })
  }

  return (
    <section>
      <h1>Ajustes</h1>

      <form onSubmit={handleSubmit} className="stack card-box">
        <h2>Repaso</h2>
        <label className="field">
          <span>Tarjetas nuevas por día</span>
          <input
            type="number"
            min={0}
            max={9999}
            step={1}
            inputMode="numeric"
            value={newCardsPerDay}
            onChange={(e) => setNewCardsPerDay(e.target.value)}
          />
        </label>
        <label className="field">
          <span>El día de estudio empieza a las (hora, 0–23)</span>
          <input
            type="number"
            min={0}
            max={23}
            step={1}
            inputMode="numeric"
            value={dayStartHour}
            onChange={(e) => setDayStartHour(e.target.value)}
          />
          <small className="muted">
            Con 4, lo que estudies a la 1 a.m. cuenta para el día anterior y no corta tu racha.
          </small>
        </label>
        <div>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </div>
        {message && (
          <p role="status" className={message.kind === 'error' ? 'text-error' : 'text-ok'}>
            {message.text}
          </p>
        )}
      </form>

      <fieldset className="stack card-box">
        <legend>
          <h2>Apariencia</h2>
        </legend>
        {(
          [
            ['system', 'Igual que el sistema'],
            ['light', 'Claro'],
            ['dark', 'Oscuro'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="theme"
              value={value}
              checked={settings.theme === value}
              onChange={() => handleTheme(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <BackupSection />
    </section>
  )
}

/** Exportar e importar todos los datos en un archivo JSON. */
function BackupSection() {
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function handleExport() {
    const backup = await exportBackup()
    const date = backup.exportedAt.toISOString().slice(0, 10)
    downloadText(`estudiar-backup-${date}.json`, serializeBackup(backup))
    setMessage({ kind: 'ok', text: 'Backup descargado. Guardalo en un lugar seguro.' })
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const n = backupSummary(backup)
      const ok = window.confirm(
        `Vas a REEMPLAZAR todos tus datos actuales por los del backup del ` +
          `${backup.exportedAt.toLocaleString('es-AR')}:\n\n` +
          `• ${n.decks} mazos, ${n.notes} notas y ${n.cards} tarjetas\n` +
          `• ${n.reviewLogs} repasos registrados\n` +
          `• ${n.lessonProgress} lecciones con progreso\n` +
          `• ${n.mistakes} errores en el cuaderno\n\n` +
          `Lo que tenés ahora se pierde. ¿Continuar?`,
      )
      if (!ok) return
      await restoreBackup(backup)
      setMessage({ kind: 'ok', text: 'Datos importados correctamente.' })
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message })
    }
  }

  return (
    <section className="stack card-box" aria-labelledby="datos">
      <h2 id="datos">Tus datos</h2>
      <p className="small muted">
        Todo se guarda solo en este navegador. Descargá un backup de vez en cuando: si borrás los datos del
        navegador o cambiás de dispositivo, lo podés importar para recuperar todo.
      </p>
      <div className="row-wrap">
        <button type="button" className="btn btn-primary" onClick={handleExport}>
          Descargar backup (JSON)
        </button>
        <label className="btn">
          Importar backup…
          <input type="file" accept=".json,application/json" onChange={handleImport} className="sr-only" />
        </label>
      </div>
      <small className="muted">Importar reemplaza todos los datos actuales (te pide confirmación).</small>
      {message && (
        <p role="status" className={message.kind === 'ok' ? 'text-ok' : 'text-error'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
