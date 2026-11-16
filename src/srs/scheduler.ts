// Acceso único al programador FSRS de la librería ts-fsrs.
//
// FSRS calcula, para cada tarjeta, cuándo conviene volver a verla para
// recordarla con ~90 % de probabilidad. No inventamos nada: usamos la
// configuración por defecto de la librería (modelo FSRS-7).

import { DefaultScheduler } from 'ts-fsrs'

/** Retención deseada: probabilidad de recordar la tarjeta el día que vence. */
export const DESIRED_RETENTION = 0.9

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler<'FSRS-7'>>>

let schedulerPromise: Promise<Scheduler> | null = null

/** Crea el programador la primera vez y después reutiliza el mismo. */
export function getScheduler(): Promise<Scheduler> {
  schedulerPromise ??= DefaultScheduler({
    version: 'FSRS-7',
    desiredRetention: DESIRED_RETENTION,
    // "Fuzz": mueve un poco al azar los intervalos largos para que las tarjetas
    // creadas el mismo día no venzan todas juntas en el futuro.
    enableFuzz: true,
  })
  return schedulerPromise
}
