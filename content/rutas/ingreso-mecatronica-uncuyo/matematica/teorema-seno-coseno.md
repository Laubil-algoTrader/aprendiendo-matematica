---
id: mat-teorema-seno-coseno
titulo: Teorema del seno y del coseno
objetivos:
  - Elegir el teorema adecuado según los datos del triángulo.
  - Resolver triángulos oblicuángulos (no rectángulos) con el teorema del seno y del coseno.
  - Reconocer el caso ambiguo (dos lados y un ángulo no comprendido).
prerrequisitos: []

recursos:
  # URLs verificadas el 2026-11-16.
  - tipo: libro
    titulo: "8.1 Triángulos no rectángulos: ley de senos (Precálculo 2ed)"
    url: https://openstax.org/books/prec%C3%A1lculo-2ed/pages/8-1-triangulos-no-rectangulos-ley-de-senos
    fuente: OpenStax
    idioma: es
  - tipo: libro
    titulo: "8.2 Triángulos no rectángulos: ley de cosenos (Precálculo 2ed)"
    url: https://openstax.org/books/prec%C3%A1lculo-2ed/pages/8-2-triangulos-no-rectangulos-ley-de-cosenos
    fuente: OpenStax
    idioma: es
  - tipo: video
    titulo: LEY DE SENOS - Ejercicio 1 (con CASIO Classwiz fx-991LA X)
    url: https://www.youtube.com/watch?v=yVFs-OrGV_8
    fuente: julioprofe
    idioma: es
    duracion: 8
  - tipo: video
    titulo: Resolver un lado con la ley de los senos
    url: https://es.khanacademy.org/math/geometry/xff63fac4:hs-geo-non-right-triangles-trigonometry/hs-geo-law-of-sines/v/law-of-sines
    fuente: Khan Academy
    idioma: es
    duracion: 6
  - tipo: video
    titulo: Resolver un lado con la ley de los cosenos
    url: https://es.khanacademy.org/math/geometry/xff63fac4:hs-geo-non-right-triangles-trigonometry/hs-geo-law-of-cosines/v/law-of-cosines-example
    fuente: Khan Academy
    idioma: es
    duracion: 5
  - tipo: articulo
    titulo: Repaso de las leyes de los senos y los cosenos
    url: https://es.khanacademy.org/math/geometry/xff63fac4:hs-geo-non-right-triangles-trigonometry/hs-geo-solving-general-triangles/a/laws-of-sines-and-cosines-review
    fuente: Khan Academy
    idioma: es
  - tipo: ejercicios
    titulo: Problemas verbales sobre triángulos generales
    url: https://es.khanacademy.org/math/geometry/xff63fac4:hs-geo-non-right-triangles-trigonometry/hs-geo-solving-general-triangles/e/law-of-sines-and-cosines-word-problems
    fuente: Khan Academy
    idioma: es

ejercicios:
  - id: e1
    enunciado: |-
      Un triángulo tiene lados $a = 8$, $b = 6$ y $c = 7$. Hallá el ángulo $A$.
    respuesta: |-
      $A \approx 75{,}52^\circ$.
    solucion: |-
      Teorema del coseno despejando el ángulo:
      $\cos A = \dfrac{b^2 + c^2 - a^2}{2bc} = \dfrac{36 + 49 - 64}{84} = \dfrac{21}{84} = 0{,}25$,
      entonces $A = \arccos(0{,}25) \approx 75{,}52^\circ$.
  - id: e2
    enunciado: |-
      En un triángulo, $A = 30^\circ$, $B = 45^\circ$ y $a = 10$. Hallá $b$.
    respuesta: |-
      $b = 10\sqrt{2} \approx 14{,}14$.
    solucion: |-
      Teorema del seno: $b = \dfrac{a \sin B}{\sin A} = \dfrac{10 \cdot \frac{\sqrt{2}}{2}}{\frac{1}{2}} = 10\sqrt{2}$.
  - id: e3
    enunciado: |-
      Dos barcos salen del mismo puerto con rumbos que forman un ángulo de $50^\circ$.
      Uno recorre $12\text{ km}$ y el otro $9\text{ km}$. ¿A qué distancia quedan entre sí?
    respuesta: |-
      Aproximadamente $9{,}28\text{ km}$.
    solucion: |-
      Conocemos dos lados y el ángulo comprendido, así que usamos el teorema del coseno:
      $d^2 = 12^2 + 9^2 - 2 \cdot 12 \cdot 9 \cos 50^\circ \approx 225 - 138{,}84 = 86{,}16$,
      y $d \approx 9{,}28$.
  - id: e4
    enunciado: |-
      Con $A = 30^\circ$, $a = 6$ y $b = 10$, ¿cuántos triángulos distintos hay?
    respuesta: |-
      Dos: $B \approx 56{,}44^\circ$ o $B \approx 123{,}56^\circ$.
    solucion: |-
      $\sin B = \dfrac{b \sin A}{a} = \dfrac{10 \cdot 0{,}5}{6} \approx 0{,}833$.
      Hay dos ángulos con ese seno: $B \approx 56{,}44^\circ$ y $B \approx 180^\circ - 56{,}44^\circ = 123{,}56^\circ$.
      Los dos sirven porque $A + B < 180^\circ$ en ambos casos.
  - id: e5
    enunciado: |-
      Mostrá que si $C = 90^\circ$, el teorema del coseno se convierte en el teorema de Pitágoras.
    solucion: |-
      $\cos 90^\circ = 0$, entonces $c^2 = a^2 + b^2 - 2ab \cdot 0 = a^2 + b^2$.

tarjetas:
  - id: seno
    tipo: cloze
    frente: |-
      Teorema del seno: $\;\dfrac{a}{\sin A} = {{c1::\dfrac{b}{\sin B}}} = \dfrac{c}{\sin C}$
  - id: coseno
    tipo: cloze
    frente: |-
      Teorema del coseno: $\;c^2 = {{c1::a^2 + b^2 - 2ab\cos C}}$
  - id: cuando-seno
    frente: |-
      ¿Con qué datos conviene usar el **teorema del seno**?
    dorso: |-
      Dos ángulos y un lado, o dos lados y el ángulo **opuesto** a uno de ellos.
  - id: cuando-coseno
    frente: |-
      ¿Con qué datos conviene usar el **teorema del coseno**?
    dorso: |-
      Dos lados y el ángulo **comprendido** entre ellos, o los tres lados.
  - id: despeje-angulo
    frente: |-
      Despejá $\cos C$ del teorema del coseno.
    dorso: |-
      $\cos C = \dfrac{a^2 + b^2 - c^2}{2ab}$
  - id: caso-ambiguo
    frente: |-
      ¿Por qué "dos lados y el ángulo opuesto a uno de ellos" se llama **caso ambiguo**?
    dorso: |-
      Porque $\sin B = \sin(180^\circ - B)$: puede haber 0, 1 o 2 triángulos que cumplan los datos.
  - id: pitagoras
    frente: |-
      ¿Qué pasa con el teorema del coseno si $C = 90^\circ$?
    dorso: |-
      Como $\cos 90^\circ = 0$, queda Pitágoras: $c^2 = a^2 + b^2$.
  - id: suma-angulos
    frente: |-
      Suma de los ángulos interiores de un triángulo.
    dorso: |-
      $180^\circ$. Sirve para hallar el tercer ángulo: $C = 180^\circ - A - B$.
---

## Notación

En un triángulo cualquiera, llamamos $a$, $b$, $c$ a los lados y $A$, $B$, $C$ a los
ángulos **opuestos** a cada uno (el ángulo $A$ está enfrente del lado $a$).

Siempre vale $A + B + C = 180^\circ$.

> Antes de calcular, revisá que la calculadora esté en **grados** (modo DEG).

## Teorema del seno

$$
\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}
$$

Los lados son proporcionales a los senos de los ángulos opuestos.

**Cuándo usarlo:** cuando conocés

- dos ángulos y un lado, o
- dos lados y el ángulo **opuesto** a uno de ellos (caso ambiguo, ver abajo).

**Ejemplo.** $A = 40^\circ$, $B = 60^\circ$, $c = 10$.
Primero $C = 180^\circ - 40^\circ - 60^\circ = 80^\circ$. Después:

$$
a = \frac{c \sin A}{\sin C} = \frac{10 \sin 40^\circ}{\sin 80^\circ} \approx 6{,}53,
\qquad
b = \frac{10 \sin 60^\circ}{\sin 80^\circ} \approx 8{,}79
$$

## Teorema del coseno

$$
c^2 = a^2 + b^2 - 2ab\cos C
$$

(y lo mismo rotando las letras: $a^2 = b^2 + c^2 - 2bc\cos A$, etc.)

Es una **generalización de Pitágoras**: si $C = 90^\circ$, $\cos C = 0$ y queda $c^2 = a^2 + b^2$.

**Cuándo usarlo:** cuando conocés

- dos lados y el ángulo **comprendido** entre ellos, o
- los tres lados (para hallar un ángulo):

$$
\cos C = \frac{a^2 + b^2 - c^2}{2ab}
$$

**Ejemplo.** $a = 5$, $b = 7$, $C = 60^\circ$:

$$
c^2 = 25 + 49 - 2 \cdot 5 \cdot 7 \cdot \tfrac{1}{2} = 39 \;\Rightarrow\; c = \sqrt{39} \approx 6{,}24
$$

## ¿Cuál uso?

| Datos que conocés | Teorema |
|---|---|
| 2 ángulos + 1 lado | seno |
| 2 lados + ángulo opuesto a uno de ellos | seno (¡caso ambiguo!) |
| 2 lados + ángulo comprendido | coseno |
| 3 lados | coseno |

## El caso ambiguo

Si conocés dos lados y un ángulo **no** comprendido, al despejar con el teorema del seno
obtenés $\sin B$. Pero hay dos ángulos entre $0^\circ$ y $180^\circ$ con el mismo seno:
$B$ y $180^\circ - B$. Hay que revisar cuáles son posibles (que $A + B < 180^\circ$):
puede haber **ninguno, uno o dos** triángulos.
