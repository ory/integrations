# Integrations with Ory

This repository contains integrations for connecting with Ory Cloud.

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

Then create a file at `<your-nextjs-app>/api/.ory/[...paths.ts]` with the
following contents:

```typescript
import { config, createApiHandler } from '@ory/integrations/next-edge'

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
import { config, createApiHandler } from '@ory/integrations/next-edge'

export { config }

const ah = createApiHandler({
  /* ... */
})
const apiHandlerWrapper = (req, res) => {
  req.query.paths = req.url.replace(/^\/api\/.ory\//, '').split('?')[0]
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
  isUiNodeTextAttributes
  // ...
} from '@ory/integrations/ui'

// ...

if (isUiNodeImageAttributes(node.attributes)) {
  console.log('it is an image: ', node.attributes.src)
}
```

### UI Node Helpers

This package contains convenience functions for UI nodes:

- `import { getNodeLabel } from '@ory/integrations/ui'`: Returns the node's
  label.
- `import { getNodeId } from '@ory/integrations/ui'`: Returns a node's ID.
- `import { filterNodesByGroups } from '@ory/integrations/ui'`: Filters nodes by
  their groups.
