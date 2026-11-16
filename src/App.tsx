// Mapa de pantallas de la app: qué componente se muestra en cada dirección.

import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { CardsPage } from './features/decks/CardsPage'
import { DecksPage } from './features/decks/DecksPage'
import { ImportCsvPage } from './features/decks/ImportCsvPage'
import { NoteEditorPage } from './features/decks/NoteEditorPage'
import { HomePage } from './features/home/HomePage'
import { MistakeEditorPage } from './features/mistakes/MistakeEditorPage'
import { MistakesPage } from './features/mistakes/MistakesPage'
import { PracticePage } from './features/practice/PracticePage'
import { ReviewPage } from './features/review/ReviewPage'
import { LessonPage } from './features/routes/LessonPage'
import { RoutePage } from './features/routes/RoutePage'
import { RoutesPage } from './features/routes/RoutesPage'
import { SettingsPage } from './features/settings/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="rutas" element={<RoutesPage />} />
        <Route path="rutas/:routeId" element={<RoutePage />} />
        <Route path="lecciones/:lessonId" element={<LessonPage />} />
        <Route path="repasar" element={<ReviewPage />} />
        <Route path="mazos" element={<DecksPage />} />
        <Route path="mazos/importar" element={<ImportCsvPage />} />
        <Route path="tarjetas" element={<CardsPage />} />
        <Route path="tarjetas/nueva" element={<NoteEditorPage key="nueva" />} />
        <Route path="tarjetas/:noteId" element={<NoteEditorPage />} />
        <Route path="errores" element={<MistakesPage />} />
        <Route path="errores/nuevo" element={<MistakeEditorPage key="nuevo" />} />
        <Route path="errores/:mistakeId" element={<MistakeEditorPage />} />
        <Route path="practica" element={<PracticePage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function NotFound() {
  return (
    <section>
      <h1>No encontrado</h1>
      <p>Esta página no existe.</p>
    </section>
  )
}
