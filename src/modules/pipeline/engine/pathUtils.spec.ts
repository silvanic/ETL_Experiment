import { describe, expect, it } from 'vitest'
import { getByPath, setByPath } from './pathUtils'

describe('getByPath', () => {
  it('retourne la donnée entière si le chemin est vide', () => {
    expect(getByPath({ a: 1 }, '')).toEqual({ a: 1 })
  })

  it('accède à une propriété simple', () => {
    expect(getByPath({ user: { name: 'Alice' } }, 'user.name')).toBe('Alice')
  })

  it('retourne undefined si le chemin est introuvable', () => {
    expect(getByPath({ a: 1 }, 'b.c')).toBeUndefined()
  })

  it('accède à un élément par index numérique', () => {
    expect(getByPath({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b')
  })

  it('accède à un élément avec notation à crochets', () => {
    expect(getByPath({ items: ['a', 'b', 'c'] }, 'items[1]')).toBe('b')
  })

  it('accède à un chemin imbriqué avec index entre crochets', () => {
    const data = { result: [{ name: 'Ada' }, { name: 'Bob' }] }
    expect(getByPath(data, 'result[1].name')).toBe('Bob')
  })

  describe('wildcard [*]', () => {
    it('retourne un tableau des valeurs mappées', () => {
      const data = { items: [{ name: 'Alice' }, { name: 'Bob' }] }
      expect(getByPath(data, 'items[*].name')).toEqual(['Alice', 'Bob'])
    })

    it('retourne undefined pour les éléments sans la propriété', () => {
      const data = { items: [{ name: 'Alice' }, { age: 30 }] }
      expect(getByPath(data, 'items[*].name')).toEqual(['Alice', undefined])
    })

    it('retourne undefined si la cible n\'est pas un tableau', () => {
      expect(getByPath({ items: 'pas un tableau' }, 'items[*].name')).toBeUndefined()
    })

    it('supporte un chemin imbriqué après le wildcard', () => {
      const data = { groups: [{ meta: { id: 1 } }, { meta: { id: 2 } }] }
      expect(getByPath(data, 'groups[*].meta.id')).toEqual([1, 2])
    })
  })
})

describe('setByPath', () => {
  it('définit une propriété simple', () => {
    const data: Record<string, unknown> = {}
    setByPath(data, 'user.name', 'Alice')
    expect(data).toEqual({ user: { name: 'Alice' } })
  })

  it('crée les objets intermédiaires manquants', () => {
    const data: Record<string, unknown> = {}
    setByPath(data, 'a.b.c', 42)
    expect(data).toEqual({ a: { b: { c: 42 } } })
  })

  it('écrase une valeur existante', () => {
    const data: Record<string, unknown> = { score: 10 }
    setByPath(data, 'score', 99)
    expect(data).toEqual({ score: 99 })
  })

  it('définit une valeur via index entre crochets', () => {
    const data: Record<string, unknown> = {
      items: [{ name: 'Alice' }, { name: 'Bob' }],
    }
    setByPath(data, 'items[1].name', 'Robert')
    expect(data).toEqual({
      items: [{ name: 'Alice' }, { name: 'Robert' }],
    })
  })

  describe('wildcard [*]', () => {
    it('modifie une propriété sur chaque élément du tableau', () => {
      const data: Record<string, unknown> = {
        items: [{ name: 'Alice', active: false }, { name: 'Bob', active: false }],
      }
      setByPath(data, 'items[*].active', true)
      expect(data).toEqual({
        items: [{ name: 'Alice', active: true }, { name: 'Bob', active: true }],
      })
    })

    it('ajoute une propriété manquante sur chaque élément', () => {
      const data: Record<string, unknown> = {
        users: [{ name: 'Alice' }, { name: 'Bob' }],
      }
      setByPath(data, 'users[*].role', 'viewer')
      expect(data).toEqual({
        users: [{ name: 'Alice', role: 'viewer' }, { name: 'Bob', role: 'viewer' }],
      })
    })

    it('ne modifie pas les éléments non-objet du tableau', () => {
      const data: Record<string, unknown> = { items: ['texte', null, 42] }
      setByPath(data, 'items[*].flag', true)
      expect(data.items).toEqual(['texte', null, 42])
    })

    it('ne fait rien si la cible n\'est pas un tableau', () => {
      const data: Record<string, unknown> = { items: 'pas un tableau' }
      setByPath(data, 'items[*].name', 'test')
      expect(data.items).toBe('pas un tableau')
    })

    it('supporte un chemin imbriqué après le wildcard', () => {
      const data: Record<string, unknown> = {
        groups: [{ meta: { id: 1 } }, { meta: { id: 2 } }],
      }
      setByPath(data, 'groups[*].meta.id', 0)
      expect(data).toEqual({ groups: [{ meta: { id: 0 } }, { meta: { id: 0 } }] })
    })
  })
})
