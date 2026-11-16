import { describe, expect, it } from 'vitest'
import { clozeOrdinals, renderCloze } from './cloze'

describe('clozeOrdinals', () => {
  it('encuentra los números de hueco sin repetir y ordenados', () => {
    expect(clozeOrdinals('{{c2::b}} y {{c1::a}} y {{c2::c}}')).toEqual([1, 2])
  })

  it('devuelve vacío si no hay huecos', () => {
    expect(clozeOrdinals('sin huecos')).toEqual([])
  })

  it('acepta pistas y saltos de línea dentro del hueco', () => {
    expect(clozeOrdinals('{{c3::línea 1\nlínea 2::pista}}')).toEqual([3])
  })
})

describe('renderCloze', () => {
  const text = 'La capital de {{c1::Mendoza}} es {{c2::Mendoza::ciudad}}.'

  it('oculta solo el hueco de esta tarjeta en el frente', () => {
    expect(renderCloze(text, 1, false)).toBe('La capital de **[…]** es Mendoza.')
  })

  it('muestra la pista si existe', () => {
    expect(renderCloze(text, 2, false)).toBe('La capital de Mendoza es **[ciudad]**.')
  })

  it('resalta la respuesta en el dorso', () => {
    expect(renderCloze(text, 1, true)).toBe('La capital de **Mendoza** es Mendoza.')
  })

  it('dentro de una fórmula usa \\boxed en vez de negrita', () => {
    const math = 'Si $|x| < {{c1::a}}$ entonces $-a < x < a$'
    expect(renderCloze(math, 1, false)).toBe('Si $|x| < \\boxed{\\,?\\,}$ entonces $-a < x < a$')
    expect(renderCloze(math, 1, true)).toBe('Si $|x| < \\boxed{a}$ entonces $-a < x < a$')
  })

  it('funciona con fórmulas en bloque', () => {
    const block = '$$x = {{c1::\\frac{-b \\pm \\sqrt{\\Delta}}{2a}}}$$'
    expect(renderCloze(block, 1, true)).toBe('$$x = \\boxed{\\frac{-b \\pm \\sqrt{\\Delta}}{2a}}$$')
  })
})
