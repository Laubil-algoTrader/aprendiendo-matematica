# Cómo escribir contenido

Toda la información de las rutas de aprendizaje vive en esta carpeta, en archivos de
texto. **No hace falta saber programar** para agregar o corregir una lección: alcanza con
editar estos archivos respetando el formato que se explica acá.

## Estructura de carpetas

```
content/
└─ rutas/
   └─ ingreso-mecatronica-uncuyo/        ← una carpeta por ruta
      ├─ ruta.yaml                       ← título, módulos y orden de las lecciones
      ├─ matematica/                     ← una carpeta por módulo (mismo nombre que su "id")
      │  ├─ valor-absoluto-inecuaciones.md   ← una lección = un archivo .md
      │  ├─ funcion-cuadratica.md
      │  └─ teorema-seno-coseno.md
      └─ fisica/
         └─ …
```

## Pasos para agregar una lección

1. Creá el archivo `.md` dentro de la carpeta del módulo, por ejemplo
   `content/rutas/ingreso-mecatronica-uncuyo/matematica/logaritmos.md`.
2. Copiá la [plantilla de lección](#plantilla-de-lección) y completala.
3. Agregá el nombre del archivo (sin `.md`) en la lista `lecciones` del módulo, en
   `ruta.yaml`. **El orden de esa lista es el orden en que aparecen las lecciones.**
4. Corré `npm test`: hay un test que revisa todo el contenido y te dice exactamente qué
   archivo y qué campo tienen un error. Con `npm run dev`, los errores también aparecen
   arriba de todo en la app.

## `ruta.yaml`

```yaml
id: ingreso-mecatronica-uncuyo          # único; minúsculas, números y guiones
titulo: Ingreso Ingeniería Mecatrónica UNCuyo
descripcion: Texto corto que explica la ruta.

modulos:
  - id: matematica                      # tiene que coincidir con el nombre de la carpeta
    titulo: Matemática
    descripcion: Opcional.
    lecciones:                          # nombres de archivo sin ".md", en orden
      - valor-absoluto-inecuaciones
      - funcion-cuadratica

  - id: fisica
    titulo: Física
    lecciones: []                       # módulo sin lecciones todavía: se muestra "Próximamente"
```

## Archivo de lección (`.md`)

Tiene dos partes:

1. **Arriba**, entre dos líneas `---`, los datos de la lección en formato YAML.
2. **Abajo**, las notas propias en Markdown (se muestran en la sección "Notas").

### Plantilla de lección

```markdown
---
id: mat-logaritmos
titulo: Logaritmos
objetivos:
  - Primer objetivo de aprendizaje.
  - Segundo objetivo.
prerrequisitos:
  - mat-funcion-cuadratica

recursos:
  - tipo: video
    titulo: Título exacto del video
    url: https://www.youtube.com/watch?v=XXXXXXXXXXX
    fuente: Nombre del canal
    idioma: es
    duracion: 10
  # TODO: buscar un artículo de OpenStax sobre el tema (dejá así lo que falte)

ejercicios:
  - id: e1
    enunciado: |-
      Calculá $\log_2 8$.
    respuesta: |-
      $3$
    solucion: |-
      Porque $2^3 = 8$.

tarjetas:
  - id: definicion
    frente: |-
      ¿Qué significa $\log_b a = c$?
    dorso: |-
      Que $b^c = a$.
  - id: propiedad-producto
    tipo: cloze
    frente: |-
      $\log_b (xy) = {{c1::\log_b x + \log_b y}}$
---

## Qué es un logaritmo

Acá van tus notas, con **Markdown** y fórmulas como $x^2$ o

$$
\log_b a = c \iff b^c = a
$$
```

### Campos

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | Identificador **único en todo el repositorio**. Minúsculas, números y guiones. Conviene empezar con el área: `mat-`, `fis-`, `mec-`. **No lo cambies después de publicarlo**: el progreso de la gente está guardado con ese id. |
| `titulo` | sí | Título de la lección. |
| `objetivos` | no | Lista de lo que se va a poder hacer al terminar. |
| `prerrequisitos` | no | Lista de `id` de otras lecciones (de cualquier ruta) que conviene completar antes. No puede haber ciclos (A necesita B y B necesita A). |
| `recursos` | no | Videos, libros, artículos de otros sitios. Ver abajo. |
| `ejercicios` | no | Ejercicios autoevaluados. Ver abajo. |
| `tarjetas` | no | Tarjetas de repaso sugeridas. Ver abajo. |

### Recursos

| Campo | Obligatorio | Valores |
|---|---|---|
| `tipo` | sí | `video`, `articulo`, `libro`, `ejercicios`, `simulacion` u `otro` |
| `titulo` | sí | El título tal como aparece en el sitio original |
| `url` | sí | Dirección completa, empezando con `https://` |
| `fuente` | sí | Quién lo publica: "Khan Academy", "OpenStax", nombre del canal… |
| `idioma` | sí | Código de 2 letras: `es`, `en`… |
| `duracion` | no | Minutos aproximados |

Los videos de YouTube (`tipo: video` con una URL de YouTube) se muestran dentro de la
lección con el reproductor oficial. El resto se muestra como enlace con su fuente.

**Reglas importantes:**

- **No copies contenido** de otros sitios: enlazalo y citá la fuente.
- **Solo URLs que hayas abierto y verificado.** Si te falta un recurso, dejá un
  comentario `# TODO: ...` en el YAML en vez de inventar una dirección.

### Ejercicios

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | Único dentro de la lección (`e1`, `e2`…) |
| `enunciado` | sí | Markdown + fórmulas |
| `respuesta` | no | Resultado final (se muestra al tocar "Ver respuesta") |
| `solucion` | no | Resolución paso a paso (se muestra al tocar "Ver resolución") |

### Tarjetas sugeridas

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | Único dentro de la lección. **No lo cambies después de publicarlo** (sirve para no duplicar tarjetas en los mazos de la gente). |
| `tipo` | no | `basica` (por defecto), `invertida` (genera también dorso → frente) o `cloze` |
| `frente` | sí | Pregunta. En `cloze`, el texto con huecos `{{c1::respuesta}}` o `{{c1::respuesta::pista}}` |
| `dorso` | sí, salvo en cloze | Respuesta. En `cloze` es un comentario opcional |
| `etiquetas` | no | Lista de palabras. Se agrega sola la etiqueta con el `id` de la lección |

Cuando alguien toca "Agregar a mis mazos", las tarjetas van a un mazo con el nombre del
módulo (por ejemplo "Matemática").

## Fórmulas y texto

- Fórmula en línea: `$x^2 + 1$`. En bloque: `$$ ... $$` en líneas separadas.
- El formato de fórmulas es LaTeX (lo dibuja [KaTeX](https://katex.org/docs/supported.html)).
- Grados: `$90^\circ$`. Decimales con coma dentro de una fórmula: `$3{,}14$`.
- Tablas, listas, **negrita** y _cursiva_ con Markdown normal.

### Ojo con el YAML

- En textos con fórmulas, dos puntos (`:`), llaves (`{`) o comillas, usá **siempre** el
  bloque `|-` y escribí el texto en las líneas siguientes, con sangría:

  ```yaml
  frente: |-
    Si $a > 0$: $|x| < a \iff -a < x < a$
  ```

  Así las barras invertidas (`\frac`, `\sqrt`) y los símbolos se leen tal cual.
- La sangría se hace con **espacios**, nunca con tabulaciones.

## Licencia

Al contribuir contenido aceptás publicarlo bajo
[CC BY-SA 4.0](LICENSE.md). Los recursos externos enlazados siguen perteneciendo a sus
autores.
