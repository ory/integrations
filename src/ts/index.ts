import {
  UiNode,
  UiNodeAnchorAttributes,
  UiNodeAttributes,
  UiNodeImageAttributes,
  UiNodeInputAttributes,
  UiNodeTextAttributes
} from '@ory/client'

export const getNodeLabel = (n: UiNode): string => {
  const attributes = n.attributes
  if (isUiNodeAnchorAttributes(attributes)) {
    return attributes.title.text
  }

  if (isUiNodeImageAttributes(attributes)) {
    return n.meta.label?.text || ''
  }

  if (isUiNodeInputAttributes(attributes)) {
    if (attributes.label.text) {
      return attributes.label.text
    }
  }

  if (n.meta.label?.text) {
    return n.meta.label.text
  }

  return ''
}

// A TypeScript type guard for nodes of the type <a>
export function isUiNodeAnchorAttributes(
  node: UiNodeAttributes
): node is UiNodeAnchorAttributes {
  return (node as UiNodeAnchorAttributes).href !== undefined
}

// A TypeScript type guard for nodes of the type <img>
export function isUiNodeImageAttributes(
  node: UiNodeAttributes
): node is UiNodeImageAttributes {
  return (node as UiNodeImageAttributes).src !== undefined
}

// A TypeScript type guard for nodes of the type <input>
export function isUiNodeInputAttributes(
  node: UiNodeAttributes
): node is UiNodeInputAttributes {
  return (node as UiNodeInputAttributes).name !== undefined
}

// A TypeScript type guard for nodes of the type <span>{text}</span>
export function isUiNodeTextAttributes(
  node: UiNodeAttributes
): node is UiNodeTextAttributes {
  return (node as UiNodeTextAttributes).text !== undefined
}

// Returns a node's ID
export function getNodeId({ attributes }: UiNode) {
  if (isUiNodeInputAttributes(attributes)) {
    return attributes.name
  } else {
    return attributes.id
  }
}
