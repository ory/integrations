import { Buffer } from "buffer"
import { CookieSerializeOptions, serialize } from "cookie"
import { IncomingHttpHeaders } from "http"
import { isText } from "istextorbinary"
import { NextApiRequest, NextApiResponse } from "next"
import parse, { splitCookiesString } from "set-cookie-parser"
import { CreateApiHandlerOptions } from "../type/create-api-handler-options"
import { getBaseUrl } from "../common/get-base-url"
import { defaultForwardedHeaders } from "../common/default-forwarded-headers"
import { processLocationHeader } from "../common/process-location-header"
import { guessCookieDomain } from "../../next-edge"

export function filterRequestHeaders(
  headers: IncomingHttpHeaders,
  forwardAdditionalHeaders?: string[],
): Headers {
  const filteredHeaders = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    const isValid =
      defaultForwardedHeaders.includes(key) ||
      (forwardAdditionalHeaders ?? []).includes(key)
    if (isValid)
      filteredHeaders.set(key, Array.isArray(value) ? value.join(",") : value)
  })
  return filteredHeaders
}

/**
 * The NextJS API configuration
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

function processSetCookieHeader(
  protocol: string,
  originalReq: NextApiRequest,
  fetchResponse: Response,
  options: CreateApiHandlerOptions,
) {
  const isTls =
    protocol === "https:" ||
    originalReq.headers["x-forwarded-proto"] === "https"

  const secure =
    options.forceCookieSecure === undefined ? isTls : options.forceCookieSecure

  const forwarded = originalReq.rawHeaders.findIndex(
    (h) => h.toLowerCase() === "x-forwarded-host",
  )
  const host =
    forwarded > -1
      ? originalReq.rawHeaders[forwarded + 1]
      : originalReq.headers.host
  const domain = guessCookieDomain(host, options)

  return parse(
    splitCookiesString(fetchResponse.headers.get("set-cookie") || ""),
  )
    .map((cookie) => ({
      ...cookie,
      domain,
      secure,
      encode: (v: string) => v,
    }))
    .map(({ value, name, ...options }) =>
      serialize(name, value, options as CookieSerializeOptions),
    )
}

/**
 * Creates a NextJS / Vercel API Handler
 *
 * For this handler to work, please set the environment variable `ORY_SDK_URL`.
 */
export function createApiHandler(options: CreateApiHandlerOptions) {
  const baseUrl = getBaseUrl(options)
  return async (req: NextApiRequest, res: NextApiResponse<string>) => {
    const { paths, ...query } = req.query

    const searchParams = new URLSearchParams()
    Object.keys(query).forEach((key) => {
      searchParams.set(key, String(query[key]))
    })

    const path = Array.isArray(paths) ? paths.join("/") : paths

    const url = new URL(path, baseUrl)
    url.search = searchParams.toString()

    if (path === "ui/welcome") {
      // A special for redirecting to the home page
      // if we were being redirected to the hosted UI
      // welcome page.
      res.redirect(303, "../../../")
      return
    }

    const headers = filterRequestHeaders(
      req.headers,
      options.forwardAdditionalHeaders,
    )

    headers.set("X-Ory-Base-URL-Rewrite", "false")
    headers.set("Ory-Base-URL-Rewrite", "false")
    headers.set("Ory-No-Custom-Domain-Redirect", "true")

    const response = await fetch(url, {
      method: req.method,
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : null,
      redirect: "manual",
    })

    for (const [key, value] of response.headers) {
      res.appendHeader(key, value)
    }

    res.removeHeader("set-cookie")
    res.removeHeader("location")

    if (response.headers.get("set-cookie")) {
      const cookies = processSetCookieHeader(
        (req as unknown as { protocol: string }).protocol,
        req,
        response,
        options,
      )
      cookies.forEach((cookie) => {
        res.appendHeader("Set-Cookie", cookie)
      })
    }

    if (response.headers.get("location")) {
      const location = processLocationHeader(
        response.headers.get("location"),
        baseUrl,
      )
      res.setHeader("Location", location)
    }

    res.removeHeader("transfer-encoding")
    res.removeHeader("content-encoding")
    res.removeHeader("content-length")

    res.status(response.status)

    const buf = Buffer.from(await response.arrayBuffer())

    if (buf.byteLength > 0) {
      if (isText(null, buf)) {
        res.send(
          buf.toString("utf-8").replace(new RegExp(baseUrl, "g"), "/api/.ory"),
        )
      } else {
        res.write(buf)
      }
    }

    res.end()
  }
}
