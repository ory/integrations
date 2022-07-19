import {
  UiNode,
  UiNodeAnchorAttributes,
  UiNodeAttributes,
  UiNodeImageAttributes,
  UiNodeInputAttributes,
  UiNodeScriptAttributes,
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
    if (attributes.label?.text) {
      return attributes.label.text
    }
  }

  return node.meta.label?.text || ''
}

/**
 * A TypeScript type guard for nodes of the type <a>
 *
 * @param attrs
 */
export function isUiNodeAnchorAttributes(
  attrs: UiNodeAttributes
): attrs is UiNodeAnchorAttributes {
  return attrs.node_type === 'a'
}

/**
 * A TypeScript type guard for nodes of the type <img>
 *
 * @param attrs
 */
export function isUiNodeImageAttributes(
  attrs: UiNodeAttributes
): attrs is UiNodeImageAttributes {
  return attrs.node_type === 'img'
}

/**
 * A TypeScript type guard for nodes of the type <input>
 *
 * @param attrs
 */
export function isUiNodeInputAttributes(
  attrs: UiNodeAttributes
): attrs is UiNodeInputAttributes {
  return attrs.node_type === 'input'
}

/**
 * A TypeScript type guard for nodes of the type <span>{text}</span>
 *
 * @param attrs
 */
export function isUiNodeTextAttributes(
  attrs: UiNodeAttributes
): attrs is UiNodeTextAttributes {
  return attrs.node_type === 'text'
}

/**
 * A TypeScript type guard for nodes of the type <script>
 *
 * @param attrs
 */
export function isUiNodeScriptAttributes(
  attrs: UiNodeAttributes
): attrs is UiNodeScriptAttributes {
  return attrs.node_type === 'script'
}

/**
 * Returns a node's ID.
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
 * Filters nodes by their groups and attributes.
 *
 * Will always add default nodes unless `withoutDefaultGroup` is true.
 * Will always add default attributes unless `withoutDefaultAttributes` is true.
 * @param nodes
 * @param groups
 * @param withoutDefaultGroup
 * @param attributes
 * @param withoutDefaultAttributes
 */
export const filterNodesByGroups = ({
  nodes,
  groups,
  withoutDefaultGroup,
  attributes,
  withoutDefaultAttributes
}: {
  nodes: Array<UiNode>
  groups?: Array<string> | string
  withoutDefaultGroup?: boolean
  attributes?: Array<string> | string
  withoutDefaultAttributes?: boolean
}) => {
  const search = (s: Array<string> | string) =>
    typeof s === 'string' ? s.split(',') : s

  const getInputType = (attr: UiNodeAttributes): string =>
    attr && isUiNodeInputAttributes(attr) ? attr.type : ''

  return nodes
    .filter(({ group }) => {
      if (!groups) return true
      const g = search(groups)
      if (!withoutDefaultGroup) {
        g.push('default')
      }
      return g.indexOf(group) > -1
    })
    .filter(({ group, attributes: attr }) => {
      if (!attributes) return true
      const a = search(attributes)
      if (!withoutDefaultAttributes) {
        // always add hidden fields e.g. csrf
        if (group.includes('default')) {
          a.push('hidden')
        }
        // automatically add the necessary fields for webauthn and totp
        if (group.includes('webauthn') || group.includes('totp')) {
          a.push('input', 'script')
        }
      }
      return a.indexOf(getInputType(attr)) > -1
    })
}
