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
import { nextjs } from '@ory/integrations'

export const config = nextjs.config
export default nextjs.createApiHandler({
  /* ... */
})
```

You need to set the environment variable `ORY_SDK_URL` to your
[Ory Cloud Project SDK URL](https://www.ory.sh/docs/concepts/services-api). For
a list of available options head over to
[`src/nextjs/index.ts`](src/nextjs/index.ts).
