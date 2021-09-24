import { UiNode } from '@ory/client'
import {filterNodesByGroups, getNodeLabel} from './index'
import nodes from './fixtures/nodes.json'

describe('generic helpers', () => {
  test('filterNodesByGroups', () => {
    const nodes: Array<Partial<UiNode>> = [
      { group: 'default', type: 'a' },
      { group: 'foo', type: 'b' },
      { group: 'bar', type: 'c' }
    ]

    const uiNodes = nodes as Array<UiNode>

    expect(filterNodesByGroups(uiNodes, 'foo,bar')).toEqual(
      nodes
    )
    expect(filterNodesByGroups(uiNodes, ['foo', 'bar'])).toEqual(
      nodes
    )
    expect(filterNodesByGroups(uiNodes, ['foo'], true)).toEqual([
      { group: 'foo', type: 'b' }
    ])
  })

  test('getNodeLabel', () => {
    expect(nodes.map(getNodeLabel)).toMatchSnapshot();
  })
})
