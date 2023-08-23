import { NextApiRequest, NextApiResponse } from "next"
import { CookieSerializeOptions, serialize } from "cookie"
import parse from "set-cookie-parser"
import { IncomingHttpHeaders } from "http"
import { isText } from "istextorbinary"
import tldjs from "tldjs"
import fetch from "node-fetch"

export function filterRequestHeaders(
  headers: IncomingHttpHeaders,
  forwardAdditionalHeaders?: string[],
): Headers {
  const defaultForwardedHeaders = [
    "accept",
    "accept-charset",
    "accept-encoding",
    "accept-language",
    "authorization",
    "cache-control",
    "content-type",
    "cookie",
    "host",
    "user-agent",
    "referer",
  ]

  const returnHeaders = new Headers()

  Object.entries(headers).forEach(([key, value]) => {
    if (defaultForwardedHeaders.includes(key) || forwardAdditionalHeaders?.includes(key)) {
      returnHeaders.set(key, value as string)
    }
  })

  return returnHeaders
}

const encode = (v: string) => v

function getBaseUrl(options: CreateApiHandlerOptions) {
  let baseUrl = options.fallbackToPlayground
    ? "https://playground.projects.oryapis.com/"
    : ""

  if (process.env.ORY_SDK_URL) {
    baseUrl = process.env.ORY_SDK_URL
  }

  if (process.env.ORY_KRATOS_URL) {
    baseUrl = process.env.ORY_KRATOS_URL
  }

  if (process.env.ORY_SDK_URL && process.env.ORY_KRATOS_URL) {
    throw new Error("Only one of ORY_SDK_URL or ORY_KRATOS_URL can be set.")
  }

  if (options.apiBaseUrlOverride) {
    baseUrl = options.apiBaseUrlOverride
  }

  return baseUrl.replace(/\/$/, "")
}

/**
 * The NextJS API configuration
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

export interface CreateApiHandlerOptions {
  /**
   * If set overrides the API Base URL. Usually, this URL
   * is taken from the ORY_KRATOS_URL environment variable.
   *
   * If you don't have a project you can use the playground project SDK URL:
   *
   *  https://playground.projects.oryapis.com
   */
  apiBaseUrlOverride?: string

  /**
   * Per default, this handler will strip the cookie domain from
   * the Set-Cookie instruction which is recommended for most set ups.
   *
   * If you are running this app on a subdomain and you want the session and CSRF cookies
   * to be valid for the whole TLD, you can use this setting to force a cookie domain.
   *
   * Please be aware that his method disables the `dontUseTldForCookieDomain` option.
   */
  forceCookieDomain?: string

  /**
   * Per default the cookie will be set on the hosts top-level-domain. If the app
   * runs on www.example.org, the cookie domain will be set automatically to example.org.
   *
   * Set this option to true to disable that behaviour.
   */
  dontUseTldForCookieDomain?: boolean

  /**
   * If set to true will set the "Secure" flag for all cookies. This might come in handy when you deploy
   * not on Vercel.
   */
  forceCookieSecure?: boolean

  /**
   * If set to true will fallback to the playground if no other value is set for the Ory SDK URL.
   */
  fallbackToPlayground?: boolean

  /*
   * Per default headers are filtered to forward only a fixed list.
   *
   * If you need to forward additional headers you can use this setting to define them.
   */
  forwardAdditionalHeaders?: string[]
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
    const search = new URLSearchParams()
    Object.keys(query).forEach((key) => {
      search.set(key, String(query[key]))
    })

    const path = Array.isArray(paths) ? paths.join("/") : paths
    const url = `${baseUrl}/${path}?${search.toString()}`

    if (path === "ui/welcome") {
      // A special for redirecting to the home page
      // if we were being redirected to the hosted UI
      // welcome page.
      res.redirect(303, "../../../")
      return
    }

    const isTls =
      (req as unknown as { protocol: string }).protocol === "https:" ||
      (req as unknown as { secure: boolean }).secure ||
      req.headers["x-forwarded-proto"] === "https"

    const upstreamHeaders = filterRequestHeaders(req.headers, options.forwardAdditionalHeaders)

    upstreamHeaders.set("X-Ory-Base-URL-Rewrite", "false")
    upstreamHeaders.set("Ory-Base-URL-Rewrite", "false")
    upstreamHeaders.set("Ory-No-Custom-Domain-Redirect", "true")

    let buf = Buffer.alloc(0)
    return new Promise<void>((resolve) =>
      fetch(url, {
        follow: 0,
        redirect: "manual",
        compress: true,
        headers: upstreamHeaders
      }).then(async (r) => {
        // rewrite the response so we can pipe it back to the client
        let location = r.headers.get("Location") || ""
        if (location.includes(baseUrl)) {
          location = location.replace(baseUrl, "/api/.ory")
        } else if (
          location.includes("/api/kratos/public/") ||
          location.includes("/self-service/") ||
          location.includes("/ui/")
        ) {
          location = "/api/.ory" + location
        }

        const secure =
          options.forceCookieSecure === undefined
            ? isTls
            : options.forceCookieSecure

        const forwarded = r.headers.get("X-Forwarded-Host")

        const host = forwarded || req.headers.host
        const domain = guessCookieDomain(host, options)

        r.headers.delete("transfer-encoding")
        r.headers.delete("content-encoding")
        r.headers.delete("content-length")

        const cookies = r.headers.get("set-cookie")
        if (cookies) {
          res.setHeader("set-cookie", parse(cookies).map((cookie) => ({
            ...cookie,
            domain,
            secure,
            encode,
          }))
            .map(({ value, name, ...options }) =>
              serialize(name, value, options as CookieSerializeOptions),
            ))
        }

        r.headers.delete("set-cookie")

        // map the rest of the headers
        r.headers.forEach((v, k) => {
          res.setHeader(k, v)
        })

        res.statusCode = r.status

        const body = await r.arrayBuffer()
        buf = Buffer.from(body)

        if (buf.length > 0) {
          if (isText(null, buf)) {
            res.send(
              buf
                .toString("utf-8")
                .replace(new RegExp(baseUrl, "g"), "/api/.ory"),
            )
          } else {
            res.write(buf)
          }
        }

        res.end()
        resolve()
      })
    )
  }
}


export function guessCookieDomain(
  url: string | undefined,
  options: CreateApiHandlerOptions,
) {
  if (!url || options.forceCookieDomain) {
    return options.forceCookieDomain
  }

  if (options.dontUseTldForCookieDomain) {
    return undefined
  }

  const parsed = tldjs.parse(url || "")

  if (!parsed.isValid || parsed.isIp) {
    return undefined
  }

  if (!parsed.domain) {
    return parsed.hostname
  }

  return parsed.domain
}
