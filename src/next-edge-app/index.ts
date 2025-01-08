import { SerializeOptions as CookieSerializeOptions, serialize } from "cookie"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { NextResponse, type NextRequest } from "next/server"
import parse, { splitCookiesString } from "set-cookie-parser"
import { getBaseUrl } from "../common/get-base-url"
import { CreateApiHandlerOptions } from "../type/create-api-handler-options"
import { defaultForwardedHeaders } from "../common/default-forwarded-headers"
import { processLocationHeader } from "../common/process-location-header"
import { guessCookieDomain } from "../common/get-cookie-domain"

export function filterRequestHeaders(
  forwardAdditionalHeaders?: string[],
): Headers {
  const filteredHeaders = new Headers()
  headers().forEach((value, key) => {
    const isValid =
      defaultForwardedHeaders.includes(key) ||
      (forwardAdditionalHeaders ?? []).includes(key)
    if (isValid) filteredHeaders.set(key, value)
  })

  return filteredHeaders
}

function processSetCookieHeader(
  protocol: string,
  fetchResponse: Response,
  options: CreateApiHandlerOptions,
) {
  const requestHeaders = headers()
  const isTls =
    protocol === "https:" || requestHeaders.get("x-forwarded-proto") === "https"

  const secure =
    options.forceCookieSecure === undefined ? isTls : options.forceCookieSecure

  const forwarded = requestHeaders.get("x-forwarded-host")
  const host = forwarded ? forwarded : requestHeaders.get("host")
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

export function createApiHandler(options: CreateApiHandlerOptions) {
  const baseUrl = getBaseUrl(options)

  const handler = async (
    request: NextRequest,
    { params }: { params: { path: string[] } },
  ) => {
    const path = request.nextUrl.pathname.replace("/api/.ory", "")
    const url = new URL(path, baseUrl)
    url.search = request.nextUrl.search

    if (path === "ui/welcome") {
      // A special for redirecting to the home page
      // if we were being redirected to the hosted UI
      // welcome page.
      redirect("../../../")
    }

    const requestHeaders = filterRequestHeaders(
      options.forwardAdditionalHeaders,
    )

    requestHeaders.set("X-Ory-Base-URL-Rewrite", "false")
    requestHeaders.set("Ory-Base-URL-Rewrite", "false")
    requestHeaders.set("Ory-No-Custom-Domain-Redirect", "true")

    // Only effective in CI.
    if (
      process.env.ORY_CI_RATE_LIMIT_HEADER &&
      process.env.ORY_CI_RATE_LIMIT_HEADER_VALUE
    ) {
      requestHeaders.set(
        process.env.ORY_CI_RATE_LIMIT_HEADER,
        process.env.ORY_CI_RATE_LIMIT_HEADER_VALUE,
      )
    }

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: requestHeaders,
        body:
          request.method !== "GET" && request.method !== "HEAD"
            ? await request.arrayBuffer()
            : null,
        redirect: "manual",
      })

      const responseHeaders = new Headers()
      for (const [key, value] of response.headers) {
        responseHeaders.append(key, value)
      }

      responseHeaders.delete("location")
      responseHeaders.delete("set-cookie")
      if (response.headers.get("set-cookie")) {
        const cookies = processSetCookieHeader(
          request.nextUrl.protocol,
          response,
          options,
        )
        cookies.forEach((cookie) => {
          responseHeaders.append("Set-Cookie", cookie)
        })
      }

      if (response.headers.get("location")) {
        const location = processLocationHeader(
          response.headers.get("location"),
          baseUrl,
        )
        responseHeaders.set("location", location)
      }

      responseHeaders.delete("transfer-encoding")
      responseHeaders.delete("content-encoding")
      responseHeaders.delete("content-length")

      const buf = Buffer.from(await response.arrayBuffer())

      try {
        return new NextResponse(
          buf.toString("utf-8").replace(new RegExp(baseUrl, "g"), "/api/.ory"),
          {
            status: response.status,
            headers: responseHeaders,
          },
        )
      } catch (err) {
        return new NextResponse(response.body, {
          status: response.status,
          headers: responseHeaders,
        })
      }
    } catch (error) {
      console.error(error, {
        path,
        url,
        method: request.method,
        headers: requestHeaders,
      })
      throw error
    }
  }

  return {
    GET: handler,
    POST: handler,
  }
}
