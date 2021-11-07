import request from 'request'
import { NextApiRequest, NextApiResponse } from 'next'
import { CookieSerializeOptions, serialize } from 'cookie'
import parse from 'set-cookie-parser'
import { IncomingHttpHeaders } from 'http'
import { Buffer } from 'buffer'
import { isText } from 'istextorbinary'

/**
 * The NextJS API configuration
 */
export const config = {
  api: {
    bodyParser: false
  }
}

const encode = (v: string) => v

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
   */
  forceCookieDomain?: string

  /**
   * If set to true will set the "Secure" flag for all cookies. This might come in handy when you deploy
   * not on Vercel.
   */
  forceCookieSecure?: boolean

  /**
   * If set to true will fallback to the playground if no other value is set for the Ory SDK URL.
   */
  fallbackToPlayground?: boolean
}

/**
 * Creates a NextJS / Vercel API Handler
 *
 * For this handler to work, please set the environment variable `ORY_KRATOS_URL`.
 */
export function createApiHandler(options: CreateApiHandlerOptions) {
  let baseUrl = options.fallbackToPlayground
    ? 'https://playground.projects.oryapis.com/'
    : ''

  if (process.env.ORY_SDK_URL) {
    baseUrl = process.env.ORY_SDK_URL
  }

  if (process.env.ORY_KRATOS_URL) {
    baseUrl = process.env.ORY_KRATOS_URL
  }

  if (process.env.ORY_SDK_URL && process.env.ORY_KRATOS_URL) {
    throw new Error('Only one of ORY_SDK_URL or ORY_KRATOS_URL can be set.')
  }

  if (options.apiBaseUrlOverride) {
    baseUrl = options.apiBaseUrlOverride
  }

  baseUrl = baseUrl.replace(/\/$/, '')

  return (req: NextApiRequest, res: NextApiResponse<string>) => {
    const { paths, ...query } = req.query
    const search = new URLSearchParams()
    Object.keys(query).forEach((key) => {
      search.set(key, String(query[key]))
    })

    const path = Array.isArray(paths) ? paths.join('/') : paths
    const url = `${baseUrl}/${path}?${search.toString()}`

    if (path === 'ui/welcome') {
      // A special for redirecting to the home page
      // if we were being redirected to the hosted UI
      // welcome page.
      res.redirect(303, '../../../')
      return
    }

    const isTls =
      (req as unknown as { protocol: string }).protocol === 'https:' ||
      (req as unknown as { secure: boolean }).secure ||
      req.headers['x-forwarded-proto'] === 'https'

    let buf = Buffer.alloc(0)
    let code = 0
    let headers: IncomingHttpHeaders
    return new Promise<void>((resolve) => {
      req
        .pipe(
          request(url, {
            followAllRedirects: false,
            followRedirect: false,
            gzip: true,
            json: false
          })
        )
        .on('response', (res) => {
          if (res.headers.location) {
            if (res.headers.location.indexOf(baseUrl) === 0) {
              res.headers.location = res.headers.location.replace(
                baseUrl,
                '/api/.ory'
              )
            } else if (
              res.headers.location.indexOf('/api/kratos/public/') === 0
            ) {
              res.headers.location = '/api/.ory' + res.headers.location
            }
          }

          const secure =
            options.forceCookieSecure === undefined
              ? isTls
              : options.forceCookieSecure
          res.headers['set-cookie'] = parse(res)
            .map((cookie) => ({
              ...cookie,
              domain: options.forceCookieDomain,
              secure,
              encode
            }))
            .map(({ value, name, ...options }) =>
              serialize(name, value, options as CookieSerializeOptions)
            )

          headers = res.headers
          code = res.statusCode
        })
        .on('data', (chunk: Buffer) => {
          buf = Buffer.concat([buf, chunk], buf.length + chunk.length)
        })
        .on('end', () => {
          delete headers['transfer-encoding']
          delete headers['content-encoding']
          delete headers['content-length']

          Object.keys(headers).forEach((key) => {
            res.setHeader(key, headers[key])
          })

          res.status(code)
          if (buf.length > 0) {
            if (isText(null, buf)) {
              res.send(
                buf
                  .toString('utf-8')
                  .replace(new RegExp(baseUrl, 'g'), '/api/.ory')
              )
            } else {
              res.write(buf)
            }
          }

          res.end()
          resolve()
        })
    })
  }
}
