import {
  UiNode,
  UiNodeAnchorAttributes,
  UiNodeAttributes,
  UiNodeGroupEnum,
  UiNodeImageAttributes,
  UiNodeInputAttributes,
  UiNodeInputAttributesTypeEnum,
  UiNodeScriptAttributes,
  UiNodeTextAttributes,
} from "@ory/client"

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
    return node.meta.label?.text || ""
  }

  if (isUiNodeInputAttributes(attributes)) {
    if (attributes.label?.text) {
      return attributes.label.text
    }
  }

  return node.meta.label?.text || ""
}

/**
 * A TypeScript type guard for nodes of the type <a>
 *
 * @param attrs
 */
export function isUiNodeAnchorAttributes(
  attrs: UiNodeAttributes,
): attrs is UiNodeAnchorAttributes {
  return attrs.node_type === "a"
}

/**
 * A TypeScript type guard for nodes of the type <img>
 *
 * @param attrs
 */
export function isUiNodeImageAttributes(
  attrs: UiNodeAttributes,
): attrs is UiNodeImageAttributes {
  return attrs.node_type === "img"
}

/**
 * A TypeScript type guard for nodes of the type <input>
 *
 * @param attrs
 */
export function isUiNodeInputAttributes(
  attrs: UiNodeAttributes,
): attrs is UiNodeInputAttributes {
  return attrs.node_type === "input"
}

/**
 * A TypeScript type guard for nodes of the type <span>{text}</span>
 *
 * @param attrs
 */
export function isUiNodeTextAttributes(
  attrs: UiNodeAttributes,
): attrs is UiNodeTextAttributes {
  return attrs.node_type === "text"
}

/**
 * A TypeScript type guard for nodes of the type <script>
 *
 * @param attrs
 */
export function isUiNodeScriptAttributes(
  attrs: UiNodeAttributes,
): attrs is UiNodeScriptAttributes {
  return attrs.node_type === "script"
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
 * Return the node input attribute type
 * In <input> elements we have a variety of types, such as text, password, email, etc.
 * When the attribute is null or the `type` attribute is not present, we assume it has no defined type.
 * @param attr
 * @returns type of node
 */
export const getNodeInputType = (attr: UiNodeAttributes): string =>
  attr && "type" in attr ? attr.type : ""

export type FilterNodesByGroups = {
  nodes: Array<UiNode>
  groups?: Array<UiNodeGroupEnum | string> | UiNodeGroupEnum | string
  withoutDefaultGroup?: boolean
  attributes?:
    | Array<UiNodeInputAttributesTypeEnum | string>
    | UiNodeInputAttributesTypeEnum
    | string
  withoutDefaultAttributes?: boolean
  excludeAttributes?:
    | Array<UiNodeInputAttributesTypeEnum | string>
    | UiNodeInputAttributesTypeEnum
    | string
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
  withoutDefaultAttributes,
  excludeAttributes,
}: FilterNodesByGroups) => {
  const search = (s: Array<string> | string) =>
    typeof s === "string" ? s.split(",") : s

  return nodes
    .filter(({ group }) => {
      if (!groups) return true
      const g = search(groups)
      if (!withoutDefaultGroup) {
        g.push("default")
      }
      return g.indexOf(group) > -1
    })
    .filter(({ group, attributes: attr }) => {
      if (!attributes) return true
      const a = search(attributes)
      if (!withoutDefaultAttributes) {
        // always add hidden fields e.g. csrf
        if (group.includes("default")) {
          a.push("hidden")
        }
        // automatically add the necessary fields for webauthn and totp
        if (group.includes("webauthn") || group.includes("totp")) {
          a.push("input", "script")
        }
      }
      return a.indexOf(getNodeInputType(attr)) > -1
    })
    .filter(({ attributes: attr }) => {
      if (!excludeAttributes) return true
      const a = search(excludeAttributes)
      return !(a.indexOf(getNodeInputType(attr)) > -1)
    })
}
