# Integrations with Ory

This repository contains integrations for connecting with Ory Cloud.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [NextJS / Vercel](#nextjs--vercel)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## NextJS / Vercel

To connect a NextJS (optionally deployed via Vercel) with Ory, do the following
in your NextJS App:

```
$ npm i --save @ory/integrations
```

Then, add create a file at `<your-nextjs-app>/api/.ory/[...paths.ts]` with the
following contents:

```typescript
import { config, createApiHandler } from '@ory/integrations/next/edge'

export { config }

export default createApiHandler({
  /* ... */
})
```

You need to set the environment variable `ORY_KRATOS_URL` to your
[Ory Cloud Project SDK URL](https://www.ory.sh/docs/concepts/services-api). For
a list of available options head over to
[`src/nextjs/index.ts`](src/next-edge/index.ts).

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
} from '@ory/integrations/ui'

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
