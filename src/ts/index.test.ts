import { UiNode } from '@ory/client'
import { filterNodesByGroups } from './index'

describe('generic helpers', () => {
  const nodes: Array<Partial<UiNode>> = [
    { group: 'default', type: 'a' },
    { group: 'foo', type: 'b' },
    { group: 'bar', type: 'c' }
  ]

  test('filterNodesByGroups', async () => {
    expect(filterNodesByGroups(nodes as Array<UiNode>, 'foo,bar')).toEqual(
      nodes
    )
    expect(filterNodesByGroups(nodes as Array<UiNode>, ['foo', 'bar'])).toEqual(
      nodes
    )
    expect(filterNodesByGroups(nodes as Array<UiNode>, ['foo'], true)).toEqual([
      { group: 'foo', type: 'b' }
    ])
  })
})
