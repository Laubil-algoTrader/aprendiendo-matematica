// Pantalla de ajustes: límite de tarjetas nuevas, hora de corte del día y tema.

import { useEffect, useState, type FormEvent } from 'react'
import { updateSettings, useSettings } from '../../db/settings'
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
    </section>
  )
}
