# NextJS with Ory


> [!CAUTION]
> This repository is deprecated and in read-only mode. Please use
> [`@ory/nextjs`](https://github.com/ory/elements/tree/main/packages/nextjs)
> instead.

This repository contains integrations for connecting with Ory Network.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [NextJS](#nextjs)
- [Vercel](#vercel)
- [SDK Helpers](#sdk-helpers)
  - [Type Guards](#type-guards)
  - [UI Node Helpers](#ui-node-helpers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## NextJS

To connect a NextJS app with Ory, do the following in your NextJS App:

```
$ npm i --save @ory/integrations
```

Then create a file at `<your-nextjs-app>/api/.ory/[...paths].ts` with the
following contents:

```typescript
import { config, createApiHandler } from "@ory/integrations/next-edge"

export { config }

export default createApiHandler({
  /* ... */
})
```

You need to set the environment variable `ORY_SDK_URL` to your
[Ory Cloud Project SDK URL](https://www.ory.sh/docs/concepts/services-api). For
a list of available options head over to
[`src/nextjs/index.ts`](src/next-edge/index.ts).

## Vercel

To connect a non NextJS vercel app, do the following in your vercel app:

```
$ npm i --save @ory/integrations
```

Then create a file at `<your-vercel-app>/api/oryproxy.js` with the following
contents:

```javascript
import { config, createApiHandler } from "@ory/integrations/next-edge"

export { config }

const ah = createApiHandler({
  /* ... */
})
const apiHandlerWrapper = (req, res) => {
  req.query.paths = req.url.replace(/^\/api\/.ory\//, "").split("?")[0]
  ah(req, res)
}
export default apiHandlerWrapper
```

Then add the following contents to `<your-vercel-app>/vercel.json`:

```
{
    "rewrites": [
        { "source": "/api/.ory/:match*", "destination": "/api/oryproxy" }
    ]
}
```

## SDK Helpers

This package contains several helpers for using the Ory SDKs with TypeScript,
JavaScript, and NodeJS.

### Type Guards

This package includes type guards for identifying UI nodes.

```ts
import {
  isUiNodeImageAttributes,
  isUiNodeInputAttributes,
  isUiNodeScriptAttributes,
  isUiNodeTextAttributes,
  // ...
} from "@ory/integrations/ui"

// ...

if (isUiNodeImageAttributes(node.attributes)) {
  console.log("it is an image: ", node.attributes.src)
}
```

### UI Node Helpers

This package contains convenience functions for UI nodes:

- `import { getNodeLabel } from '@ory/integrations/ui'`: Returns the node's
  label.
- `import { getNodeId } from '@ory/integrations/ui'`: Returns a node's ID.
- `import { filterNodesByGroups } from '@ory/integrations/ui'`: Filters nodes by
  their groups.

An example of using the `filterNodesByGroups` function could be to map the
UiNode[] to a certain JSX components.

The example below is from the [ory/themes](https://github.com/ory/themes)
repository and is used to map out the UI Nodes to JSX Components.

Understanding `filterNodesByGroups` is quite easy if you think about it as a
hierarchy:

```ts
const nodes = [
  {
    group: "webauthn",
    attributes: {
      node_type: "input",
      type: "input",
    },
  },
  {
    group: "oidc",
    attributes: {
      node_types: "button",
      type: "submit",
    },
  },
  {
    group: "oidc", //<-- take note here, we have 2 oidc groups
    attributes: {
      node_types: "input",
      type: "checkbox"
    }
  }
  {
    group: "foo",
    attributes: {
      node_types: "bar",
      type: "bar",
    },
  },
]

filterNodesByGroups({
  nodes: nodes,
  groups: "oidc,webauthn", //<-- filter these first
  attributes: "submit", // <-- then these will only take nodes containing the `submit` attributes
  withoutDefaultAttributes: true, //<-- dont add 'hidden' and 'script' fields when we specify attributes
  excludeAttributes: "checkbox", // <-- defining this wont do much here since we defined attributes. exclude the attributes to see what happens.
})
```

How will our output look like?

```diff
[
-  {
-    group: "webauthn",
-    attributes: {
-      node_type: "input",
-      type: "input",
-    },
-  },
+  {
+    group: "oidc",
+    attributes: {
+      node_types: "button",
+      type: "submit",
+    },
+  },
-  {
-    group: "oidc", //<-- take note here, we have 2 oidc groups
-    attributes: {
-      node_types: "input",
-      type: "checkbox"
-    }
-  }
-  {
-    group: "foo",
-    attributes: {
-      node_types: "bar",
-      type: "bar",
-    },
-  },
]
```

An example is we have a UINode containing the group "totp" and attributes node
type "input".

```json5
{
  group: "totp",
  attributes: {
    name: "f",
    type: "input",
    node_type: "input",
  },
}
```

Our end goal is to map it to HTML, something like this.

```html
<input type="input" name="f" />
```

To achieve that, we could wrap it in a nifty JSX component which returns the
correct component based on our UI node type.

We accept a `filter` object which is basically the `FilterNodesByGroups` type
and return a `<Node />` component, which is a component that helps us return our
specific HTML.

```tsx
export const FilterFlowNodes = ({
  filter,
  includeCSRF,
}: {
  filter: FilterNodesByGroups
  includeCSRF?: boolean
}): JSX.Element | null => {
  const getInputName = (node: UiNode): string =>
    isUiNodeInputAttributes(node.attributes) ? node.attributes.name : ""

  // Here we are using our filterNodesByGroups to get the nodes we really want. We can even do some more filtering and mapping
  const nodes = filterNodesByGroups(filter)
    // we don't want to map the csrf token every time, only on the form level
    .filter((node) =>
      getInputName(node) === "csrf_token" && !includeCSRF ? false : true,
    )
    .map((node, k) =>
      ["hidden"].includes(getNodeInputType(node.attributes))
        ? {
            node: <Node node={node} key={k} />,
            hidden: true,
          }
        : {
            node: <Node node={node} key={k} />,
            hidden: false,
          },
    )

  return nodes.length > 0 ? (
    <>
      // we don't want hidden fields to create new gaps
      {nodes.filter((node) => node.hidden).map((node) => node.node)}
      <div className={gridStyle({ gap: 16 })}>
        {nodes.filter((node) => !node.hidden).map((node) => node.node)}
      </div>
    </>
  ) : null
}
```

Now we can use our wrapper to return the HTML we want based on the `nodes`.

Here we only want nodes that do not have the `hidden` attribute.

```tsx
<FilterFlowNodes
  filter={{
    nodes: nodes,
    excludeAttributes: "hidden",
  }}
/>
```

Another more complex example is to filter out the UI nodes to only retrieve the
`oidc` and `password` groups. We also exclude the `default` group here with
`withoutDefaultGroup: true`. Furthermore we do some exclusions on the
`submit and `hidden`attributes, so any group which has an attribute containing a node type`submit`or`hidden`
will be filtered out.

```tsx
<FilterFlowNodes
  filter={{
    nodes: nodes,
    groups: ["oidc", "password"],
    withoutDefaultGroup: true,
    excludeAttributes: ["submit", "hidden"],
  }}
/>
```

Another example of us wanting the `oidc` and `webauthn` group (note: we can use
comma seperated strings instead of an array). We also exclude default attributes
with `withoutDefaultAttributes: true` which are `hidden` and `script` elements.
This will also only return us the nodes which have a `submit` attribute.

```tsx
<FilterFlowNodes
  filter={{
    nodes: flow.ui.nodes,
    groups: "oidc,webauthn",
    withoutDefaultAttributes: true,
    attributes: "submit",
  }}
/>
```
