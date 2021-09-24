import {
  UiNode,
  UiNodeAnchorAttributes,
  UiNodeAttributes,
  UiNodeImageAttributes,
  UiNodeInputAttributes,
  UiNodeTextAttributes
} from '@ory/client'

/**
 * Returns the node's label.
 *
 * @param node
 * @return label
 */
export const getNodeLabel = (node: UiNode): string => {
  const attributes = node.attributes
  if (isUiNodeAnchorAttributes(attributes)) {
    return attributes.title.text
  }

  if (isUiNodeImageAttributes(attributes)) {
    return node.meta.label?.text || ''
  }

  if (isUiNodeInputAttributes(attributes)) {
    if (attributes.label.text) {
      return attributes.label.text
    }
  }

  if (node.meta.label?.text) {
    return node.meta.label.text
  }

  return ''
}

/**
 * A TypeScript type guard for nodes of the type <a>
 *
 * @param node
 */
export function isUiNodeAnchorAttributes(
  node: UiNodeAttributes
): node is UiNodeAnchorAttributes {
  return (node as UiNodeAnchorAttributes).href !== undefined
}

/**
 * A TypeScript type guard for nodes of the type <img>
 *
 * @param node
 */
export function isUiNodeImageAttributes(
  node: UiNodeAttributes
): node is UiNodeImageAttributes {
  return (node as UiNodeImageAttributes).src !== undefined
}

/**
 * A TypeScript type guard for nodes of the type <input>
 *
 * @param node
 */
export function isUiNodeInputAttributes(
  node: UiNodeAttributes
): node is UiNodeInputAttributes {
  return (node as UiNodeInputAttributes).name !== undefined
}

/**
 * A TypeScript type guard for nodes of the type <span>{text}</span>
 *
 * @param node
 */
export function isUiNodeTextAttributes(
  node: UiNodeAttributes
): node is UiNodeTextAttributes {
  return (node as UiNodeTextAttributes).text !== undefined
}

/**
 * Returns a node's ID
 *
 * @param attributes
 */
export function getNodeId({ attributes }: UiNode) {
  if (isUiNodeInputAttributes(attributes)) {
    return attributes.name
  } else {
    return attributes.id
  }
}

/**
 * Filters nodes by their groups.
 *
 * Will always add default nodes unless `withoutDefaultGroup` is true.
 *
 * @param nodes
 * @param groups
 * @param withoutDefaultGroup
 */
export const filterNodesByGroups = (
  nodes: Array<UiNode>,
  groups?: Array<string> | string,
  withoutDefaultGroup?: boolean
) => {
  if (!groups || groups.length === 0) {
    return nodes
  }

  const search = typeof groups === 'string' ? groups.split(',') : groups
  if (!withoutDefaultGroup) {
    search.push('default')
  }

  return nodes.filter(({ group }) => search.indexOf(group) > -1)
}
