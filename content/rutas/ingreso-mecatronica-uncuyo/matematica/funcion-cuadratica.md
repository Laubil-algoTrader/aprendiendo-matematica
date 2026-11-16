---
id: mat-funcion-cuadratica
titulo: Función cuadrática
objetivos:
  - Reconocer los elementos de una parábola - concavidad, vértice, eje de simetría, raíces y ordenada al origen.
  - Calcular raíces con la fórmula resolvente e interpretar el discriminante.
  - Pasar entre las formas polinómica, canónica y factorizada.
  - Resolver inecuaciones cuadráticas y problemas de máximo o mínimo.
prerrequisitos:
  - mat-valor-absoluto-inecuaciones

recursos:
  # URLs verificadas el 2026-11-16.
  - tipo: libro
    titulo: 3.2 Funciones cuadráticas (Precálculo 2ed)
    url: https://openstax.org/books/prec%C3%A1lculo-2ed/pages/3-2-funciones-cuadraticas
    fuente: OpenStax
    idioma: es
  - tipo: video
    titulo: Análisis de funciones cuadráticas | Ej. 2
    url: https://www.youtube.com/watch?v=E6ysFJEIyEc
    fuente: julioprofe
    idioma: es
    duracion: 16
  - tipo: video
    titulo: Introducción a la forma canónica
    url: https://es.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations/x2f8bb11595b61c86:vertex-form/v/vertex-form-intro
    fuente: Khan Academy
    idioma: es
    duracion: 6
  - tipo: articulo
    titulo: Repaso del discriminante
    url: https://es.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations/x2f8bb11595b61c86:quadratic-formula-a1/a/discriminant-review
    fuente: Khan Academy
    idioma: es
  - tipo: articulo
    titulo: Repaso de graficación de cuadráticas
    url: https://es.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations/x2f8bb11595b61c86:quadratic-forms-features/a/graphing-quadratics-review
    fuente: Khan Academy
    idioma: es
  - tipo: ejercicios
    titulo: Fórmula cuadrática
    url: https://es.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations/x2f8bb11595b61c86:quadratic-formula-a1/e/quadratic_equation
    fuente: Khan Academy
    idioma: es

ejercicios:
  - id: e1
    enunciado: |-
      Para $f(x) = -x^2 + 2x + 8$, hallá el vértice, el eje de simetría, las raíces y la imagen.
    respuesta: |-
      Vértice $(1, 9)$, eje $x = 1$, raíces $x = -2$ y $x = 4$, imagen $(-\infty, 9]$.
    solucion: |-
      $a = -1,\ b = 2,\ c = 8$.
      $x_v = -\dfrac{2}{2 \cdot (-1)} = 1$ y $y_v = f(1) = -1 + 2 + 8 = 9$.

      $\Delta = 2^2 - 4(-1)(8) = 36$, entonces $x = \dfrac{-2 \pm 6}{-2}$, o sea $x = -2$ o $x = 4$.

      Como $a < 0$ la parábola abre hacia abajo: el vértice es un máximo y la imagen es $(-\infty, 9]$.
  - id: e2
    enunciado: |-
      Escribí $f(x) = 2x^2 - 8x + 5$ en forma canónica.
    respuesta: |-
      $f(x) = 2(x - 2)^2 - 3$.
    solucion: |-
      $x_v = \dfrac{8}{4} = 2$, $\;y_v = f(2) = 8 - 16 + 5 = -3$. Entonces $f(x) = 2(x - 2)^2 - 3$.

      Verificación: $2(x^2 - 4x + 4) - 3 = 2x^2 - 8x + 5$. ✓
  - id: e3
    enunciado: |-
      ¿Para qué valor de $k$ la ecuación $x^2 + 6x + k = 0$ tiene una raíz doble?
    respuesta: |-
      $k = 9$.
    solucion: |-
      Raíz doble $\iff \Delta = 0$: $\;36 - 4k = 0 \Rightarrow k = 9$. Queda $(x + 3)^2 = 0$.
  - id: e4
    enunciado: |-
      Resolvé $x^2 - x - 6 \ge 0$.
    respuesta: |-
      $(-\infty, -2] \cup [3, +\infty)$.
    solucion: |-
      Raíces: $x = \dfrac{1 \pm 5}{2}$, o sea $-2$ y $3$. Como $a > 0$, la parábola está por
      encima del eje $x$ **fuera** de las raíces.
  - id: e5
    enunciado: |-
      La altura de una pelota es $h(t) = -5t^2 + 20t$ (metros, con $t$ en segundos).
      ¿Cuál es la altura máxima y en qué momento vuelve al suelo?
    respuesta: |-
      Altura máxima $20\text{ m}$ en $t = 2\text{ s}$; vuelve al suelo en $t = 4\text{ s}$.
    solucion: |-
      $t_v = -\dfrac{20}{2(-5)} = 2$ y $h(2) = -20 + 40 = 20$.
      Suelo: $-5t(t - 4) = 0 \Rightarrow t = 0$ (lanzamiento) o $t = 4$.

tarjetas:
  - id: vertice
    tipo: cloze
    frente: |-
      Abscisa del vértice de $f(x) = ax^2 + bx + c$: $\;x_v = {{c1::-\dfrac{b}{2a}}}$
  - id: resolvente
    tipo: cloze
    frente: |-
      Fórmula resolvente: $\;x_{1,2} = {{c1::\dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}}}$
  - id: discriminante
    tipo: cloze
    frente: |-
      Con $\Delta = b^2 - 4ac$: si $\Delta > 0$ hay {{c1::dos raíces reales distintas}};
      si $\Delta = 0$, {{c2::una raíz doble}}; si $\Delta < 0$, {{c3::ninguna raíz real}}.
  - id: signo-a
    frente: |-
      En $f(x) = ax^2 + bx + c$, ¿qué indica el signo de $a$?
    dorso: |-
      $a > 0$: ramas hacia arriba, el vértice es un **mínimo**.
      $a < 0$: ramas hacia abajo, el vértice es un **máximo**.
  - id: forma-canonica
    frente: |-
      Forma canónica de la función cuadrática (y qué es cada letra).
    dorso: |-
      $f(x) = a(x - h)^2 + k$, donde $(h, k)$ es el vértice.
  - id: forma-factorizada
    frente: |-
      Forma factorizada de la función cuadrática.
    dorso: |-
      $f(x) = a(x - x_1)(x - x_2)$, donde $x_1$ y $x_2$ son las raíces.
  - id: ordenada-origen
    frente: |-
      En $f(x) = ax^2 + bx + c$, ¿qué representa $c$?
    dorso: |-
      La **ordenada al origen**: $f(0) = c$, el punto donde la parábola corta al eje $y$.
  - id: ejemplo-vertice
    frente: |-
      Vértice de $f(x) = x^2 - 4x + 3$
    dorso: |-
      $(2, -1)$, porque $x_v = \dfrac{4}{2} = 2$ y $f(2) = 4 - 8 + 3 = -1$.
  - id: inecuacion
    frente: |-
      Si $a > 0$ y las raíces son $x_1 < x_2$, ¿dónde es $ax^2 + bx + c < 0$?
    dorso: |-
      **Entre** las raíces: $(x_1, x_2)$. Fuera de ellas la función es positiva.
---

## La función cuadrática

Es una función de la forma

$$
f(x) = ax^2 + bx + c, \qquad a \neq 0
$$

Su gráfica es una **parábola**.

- Si $a > 0$, las ramas van hacia arriba y el vértice es un **mínimo**.
- Si $a < 0$, las ramas van hacia abajo y el vértice es un **máximo**.
- $c = f(0)$ es la **ordenada al origen**: donde la parábola corta al eje $y$.

## Vértice y eje de simetría

$$
x_v = -\frac{b}{2a}, \qquad y_v = f(x_v)
$$

La recta vertical $x = x_v$ es el **eje de simetría**. La **imagen** es $[y_v, +\infty)$ si
$a > 0$, o $(-\infty, y_v]$ si $a < 0$.

## Raíces y discriminante

Las raíces (donde la parábola corta al eje $x$) salen de la **fórmula resolvente**:

$$
x_{1,2} = \frac{-b \pm \sqrt{\Delta}}{2a}, \qquad \Delta = b^2 - 4ac
$$

| Discriminante | Raíces reales | La parábola… |
|---|---|---|
| $\Delta > 0$ | dos distintas | corta al eje $x$ en dos puntos |
| $\Delta = 0$ | una doble | toca al eje $x$ en el vértice |
| $\Delta < 0$ | ninguna | no toca al eje $x$ |

## Tres formas de escribirla

| Forma | Expresión | Muestra directamente |
|---|---|---|
| Polinómica | $ax^2 + bx + c$ | ordenada al origen $c$ |
| Canónica | $a(x - h)^2 + k$ | vértice $(h, k)$ |
| Factorizada | $a(x - x_1)(x - x_2)$ | raíces $x_1, x_2$ |

## Ejemplo completo

$f(x) = x^2 - 4x + 3$, con $a = 1,\ b = -4,\ c = 3$.

- Vértice: $x_v = \frac{4}{2} = 2$, $\;y_v = 4 - 8 + 3 = -1$, o sea $(2, -1)$.
- Discriminante: $\Delta = 16 - 12 = 4 > 0$. Raíces: $x = \frac{4 \pm 2}{2}$, es decir $1$ y $3$.
- Canónica: $(x - 2)^2 - 1$. Factorizada: $(x - 1)(x - 3)$.
- Imagen: $[-1, +\infty)$.

## Inecuaciones cuadráticas

Primero se buscan las raíces y después se mira la forma de la parábola. Por ejemplo, como
$x^2 - 4x + 3$ tiene $a > 0$ y raíces $1$ y $3$:

$$
x^2 - 4x + 3 < 0 \iff 1 < x < 3
$$

Conexión con la lección anterior: $x^2 < 9 \iff \sqrt{x^2} < 3 \iff |x| < 3 \iff -3 < x < 3$.
