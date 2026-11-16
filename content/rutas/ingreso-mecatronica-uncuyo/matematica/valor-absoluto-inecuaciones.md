---
id: mat-valor-absoluto-inecuaciones
titulo: Valor absoluto e inecuaciones
objetivos:
  - Interpretar el valor absoluto como una distancia en la recta numérica.
  - Resolver inecuaciones lineales, recordando cuándo se invierte la desigualdad.
  - Resolver ecuaciones e inecuaciones con valor absoluto y expresar el resultado como intervalo.
prerrequisitos: []

recursos:
  # URLs verificadas el 2026-11-16.
  - tipo: libro
    titulo: 1.6 Funciones de valor absoluto (Precálculo 2ed)
    url: https://openstax.org/books/prec%C3%A1lculo-2ed/pages/1-6-funciones-de-valor-absoluto
    fuente: OpenStax
    idioma: es
  - tipo: video
    titulo: Desigualdades o inecuaciones con valor absoluto | Ejercicio 1
    url: https://www.youtube.com/watch?v=Ogxr5wwVMAw
    fuente: julioprofe
    idioma: es
    duracion: 5
  - tipo: video
    titulo: Introducción a las gráficas y ecuaciones de valor absoluto
    url: https://es.khanacademy.org/math/algebra-home/alg-absolute-value/alg-absolute-value-equations/v/absolute-value-equations
    fuente: Khan Academy
    idioma: es
    duracion: 11
  - tipo: video
    titulo: Introducción a las desigualdades de valor absoluto
    url: https://es.khanacademy.org/math/algebra-home/alg-absolute-value/alg-absolute-value-inequalities/v/absolute-value-inequalities
    fuente: Khan Academy
    idioma: es
    duracion: 13
  - tipo: ejercicios
    titulo: Resuelve ecuaciones de valor absoluto
    url: https://es.khanacademy.org/math/algebra-home/alg-absolute-value/alg-absolute-value-equations/e/absolute_value_equations
    fuente: Khan Academy
    idioma: es
  - tipo: ejercicios
    titulo: Desigualdades lineales de varios pasos
    url: https://es.khanacademy.org/math/algebra-home/alg-basic-eq-ineq/alg-multi-step-inequalities/e/linear_inequalities
    fuente: Khan Academy
    idioma: es

ejercicios:
  - id: e1
    enunciado: |-
      Resolvé $|3x - 6| = 9$.
    respuesta: |-
      $x = 5$ o $x = -1$.
    solucion: |-
      $3x - 6 = 9 \Rightarrow x = 5$, o bien $3x - 6 = -9 \Rightarrow x = -1$.
  - id: e2
    enunciado: |-
      Resolvé $-2x + 5 > 11$ y escribí la solución como intervalo.
    respuesta: |-
      $x < -3$, es decir $(-\infty, -3)$.
    solucion: |-
      $-2x > 6$. Al dividir por $-2$ (negativo) **se invierte** la desigualdad: $x < -3$.
  - id: e3
    enunciado: |-
      Resolvé $|x - 4| < 2$.
    respuesta: |-
      $(2, 6)$.
    solucion: |-
      $-2 < x - 4 < 2 \Rightarrow 2 < x < 6$. Son los números que están a menos de 2 unidades del 4.
  - id: e4
    enunciado: |-
      Resolvé $|2x + 1| \ge 7$.
    respuesta: |-
      $(-\infty, -4] \cup [3, +\infty)$.
    solucion: |-
      $2x + 1 \le -7 \Rightarrow x \le -4$, o bien $2x + 1 \ge 7 \Rightarrow x \ge 3$.
  - id: e5
    enunciado: |-
      ¿Qué valores de $x$ cumplen $|x + 3| < -1$?
    respuesta: |-
      Ninguno: la solución es el conjunto vacío $\varnothing$.
    solucion: |-
      Un valor absoluto nunca es negativo, así que nunca puede ser menor que $-1$.

tarjetas:
  - id: definicion-geometrica
    frente: |-
      ¿Qué significa $|x|$ geométricamente?
    dorso: |-
      La **distancia** entre $x$ y el $0$ en la recta numérica (por eso nunca es negativa).
  - id: distancia
    tipo: invertida
    frente: |-
      $|a - b|$
    dorso: |-
      La distancia entre $a$ y $b$ en la recta numérica.
  - id: menor-que
    tipo: cloze
    frente: |-
      Si $a > 0$: $\;|x| < a \iff {{c1::-a < x < a}}$
  - id: mayor-que
    tipo: cloze
    frente: |-
      Si $a > 0$: $\;|x| > a \iff$ {{c1::$x < -a$ o $x > a$}}
  - id: invertir-desigualdad
    frente: |-
      Al multiplicar o dividir los dos lados de una inecuación por un número **negativo**, ¿qué pasa?
    dorso: |-
      Se **invierte** el sentido de la desigualdad. Ej.: $-2x > 6 \Rightarrow x < -3$.
  - id: sin-solucion
    frente: |-
      ¿Para qué valores de $a$ la ecuación $|x| = a$ no tiene solución?
    dorso: |-
      Para $a < 0$: un valor absoluto nunca es negativo.
  - id: raiz-cuadrado
    frente: |-
      $\sqrt{x^2} = \; ?$
    dorso: |-
      $|x|$ (¡no $x$!). Ej.: $\sqrt{(-3)^2} = \sqrt{9} = 3 = |-3|$.
  - id: desigualdad-triangular
    frente: |-
      ¿Es cierto que $|a + b| = |a| + |b|$ siempre?
    dorso: |-
      No. En general $|a + b| \le |a| + |b|$ (desigualdad triangular).
      Ej.: $|3 + (-5)| = 2$, pero $|3| + |-5| = 8$.
  - id: ejemplo-intervalo
    frente: |-
      Resolvé $|x - 3| \le 2$.
    dorso: |-
      $1 \le x \le 5$, o sea $[1, 5]$: los números a distancia $\le 2$ del $3$.
---

## Valor absoluto

El **valor absoluto** de un número es su distancia al cero:

$$
|x| = \begin{cases} \;\;\,x & \text{si } x \ge 0 \\ -x & \text{si } x < 0 \end{cases}
$$

Por ejemplo, $|5| = 5$ y $|-5| = 5$: los dos están a 5 unidades del 0.

Más en general, $|a - b|$ es la **distancia entre $a$ y $b$**. Pensarlo como distancia
hace que casi todos los ejercicios se vuelvan intuitivos.

**Propiedades útiles**

- $|x| \ge 0$ siempre.
- $|x \cdot y| = |x| \cdot |y|$ y $\left|\dfrac{x}{y}\right| = \dfrac{|x|}{|y|}$.
- $\sqrt{x^2} = |x|$.
- $|x + y| \le |x| + |y|$ (desigualdad triangular). **No** vale la igualdad en general.

## Inecuaciones lineales

Se resuelven como las ecuaciones, con **una diferencia clave**: si multiplicás o dividís
ambos lados por un número negativo, la desigualdad **se invierte**.

$$
-2x + 5 > 11 \;\Rightarrow\; -2x > 6 \;\Rightarrow\; x < -3
$$

La solución suele ser un **intervalo**: $(-\infty, -3)$. Corchete $[\;]$ si el extremo
está incluido ($\le$, $\ge$) y paréntesis $(\;)$ si no lo está o es $\pm\infty$.

## Ecuaciones con valor absoluto

Para $a > 0$: $\;|x| = a \iff x = a$ o $x = -a$.

Si $a = 0$, la única solución es $x = 0$; si $a < 0$, **no hay solución**.

## Inecuaciones con valor absoluto

Para $a > 0$:

| Inecuación | Equivale a | Idea |
|---|---|---|
| $\lvert x \rvert < a$ | $-a < x < a$ | cerca del 0 |
| $\lvert x \rvert > a$ | $x < -a$ **o** $x > a$ | lejos del 0 |

Lo mismo con $\le$ y $\ge$, incluyendo los extremos.

**Ejemplo 1.** $|2x - 3| \le 5$

$$
-5 \le 2x - 3 \le 5 \;\Rightarrow\; -2 \le 2x \le 8 \;\Rightarrow\; -1 \le x \le 4
$$

Solución: $[-1, 4]$.

**Ejemplo 2.** $|x + 1| > 3$

$$
x + 1 < -3 \;\text{ o }\; x + 1 > 3 \;\Rightarrow\; x < -4 \;\text{ o }\; x > 2
$$

Solución: $(-\infty, -4) \cup (2, +\infty)$.

## Errores frecuentes

- Olvidar invertir la desigualdad al dividir por un negativo.
- Escribir $|a + b| = |a| + |b|$.
- En $|x| > a$, escribir "$-a > x > a$" (eso no tiene solución): son **dos** intervalos separados.
- Simplificar $\sqrt{x^2}$ como $x$ en vez de $|x|$.
