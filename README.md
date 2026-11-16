# Estudiar — plataforma de estudio con repaso espaciado

Web app open source para estudiar **matemática, física y electrónica**
(ESP32/Arduino) siguiendo **rutas de aprendizaje**, con un sistema propio de
**tarjetas de repaso espaciado** (al estilo Anki, con el algoritmo FSRS) y un
**cuaderno de errores**.

- **Local-first:** tus datos se guardan solo en tu navegador (IndexedDB).
  No hay cuentas ni servidores. Podés exportar un backup cuando quieras.
- **El contenido no se copia de otros sitios:** cada lección enlaza o embebe
  recursos externos (YouTube, Khan Academy, OpenStax…) citando la fuente, y
  agrega notas, ejercicios y tarjetas propias.
- **Cualquiera puede contribuir lecciones** editando archivos de texto en
  `/content`, sin tocar código.

> Estado: en desarrollo (v1 por etapas). Ver "Hoja de ruta" abajo.

## Cómo correr el proyecto

Necesitás **Node.js 22 o superior** y **npm**. En Ubuntu/Debian:

```bash
sudo apt install -y nodejs npm
```

Después, dentro de la carpeta del proyecto:

```bash
npm install        # descarga las dependencias (solo la primera vez)
npm run dev        # abre la app en http://localhost:5173
```

Otros comandos:

| Comando             | Qué hace                                              |
| ------------------- | ----------------------------------------------------- |
| `npm test`          | corre todos los tests una vez                         |
| `npm run test:watch`| corre los tests y los repite al guardar cambios       |
| `npm run typecheck` | revisa los tipos de TypeScript                        |
| `npm run build`     | genera el sitio estático final en `dist/`             |
| `npm run preview`   | sirve `dist/` para probar el sitio ya compilado       |

## Cómo usar las tarjetas

- **Mazos** → crear mazos, ver cuántas tarjetas tocan hoy, repasar.
- **+ Nueva tarjeta** → tres tipos:
  - *Básica*: frente → dorso.
  - *Básica e invertida*: genera dos tarjetas (frente → dorso y dorso → frente).
  - *Cloze*: texto con huecos `{{c1::respuesta}}` o `{{c1::respuesta::pista}}`.
    Cada número (`c1`, `c2`…) es una tarjeta distinta. Funciona dentro de fórmulas.
- **Repasar** → atajos: `Espacio` muestra la respuesta, `1` Otra vez, `2` Difícil,
  `3` Bien, `4` Fácil, `Ctrl+Z` deshace la última calificación.
- La cola de cada día tiene las tarjetas vencidas más hasta 15 nuevas
  (configurable en **Ajustes**). De una misma nota se ve una sola tarjeta nueva por día.
- El programa de repasos lo calcula [FSRS](https://github.com/open-spaced-repetition/ts-fsrs)
  (versión FSRS-7) apuntando a recordar el 90 % de las tarjetas.

## Cómo contribuir contenido

Las rutas, módulos y lecciones son archivos **Markdown + YAML** dentro de
`/content`. El formato exacto está explicado en
[`content/README.md`](content/README.md), con una plantilla lista para copiar.

Para proponer una lección nueva: hacé un fork, agregá o editá el archivo,
corré `npm test` (hay un test que valida todo el contenido) y abrí un pull request.

Reglas del contenido:

1. **No copies** texto, imágenes ni ejercicios de otros sitios: enlazalos y citá la fuente.
2. Usá **solo URLs que hayas verificado**. Si no tenés una, dejá un `TODO`.
3. Las fórmulas van en LaTeX entre `$...$` (en línea) o `$$...$$` (en bloque).

## Cómo está hecho (para quien quiera tocar código)

| Pieza                          | Para qué                                             |
| ------------------------------ | ---------------------------------------------------- |
| Vite + React + TypeScript      | la interfaz                                          |
| React Router (`HashRouter`)    | navegación; funciona en GitHub Pages sin config      |
| Dexie (IndexedDB)              | base de datos local en el navegador                  |
| ts-fsrs (FSRS-7)               | programa cuándo repasar cada tarjeta                 |
| KaTeX                          | fórmulas matemáticas                                 |
| Vitest + Testing Library       | tests                                                |

Carpetas principales:

```
content/      rutas y lecciones (Markdown + YAML) — licencia CC BY-SA 4.0
src/
  types/      tipos de datos compartidos
  db/         base de datos local (Dexie) y ajustes
  srs/        repaso espaciado (FSRS), cola diaria, cloze
  content/    carga y validación de /content
  features/   pantallas (inicio, rutas, mazos, repaso, errores, práctica, ajustes)
  components/ piezas de interfaz reutilizables
  lib/        utilidades (fechas, CSV, backup)
```

## Hoja de ruta (v1)

- [x] 1. Modelo de datos y almacenamiento local
- [x] 2. Tarjetas y sesión de repaso con FSRS
- [x] 3. Rutas y lecciones (+ contenido inicial)
- [x] 4. Cuaderno de errores
- [x] 5. Panel de inicio
- [ ] 6. Práctica intercalada
- [ ] 7. Importar/exportar (CSV y backup JSON)
- [ ] 8. Publicación en GitHub Pages

## Licencia

- **Código:** [MIT](LICENSE).
- **Contenido propio** de `/content`: [CC BY-SA 4.0](content/LICENSE.md).
- Los recursos externos enlazados pertenecen a sus autores y tienen sus propias licencias.
