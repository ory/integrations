import request from 'request'
import { NextApiRequest, NextApiResponse } from 'next'
import { CookieSerializeOptions, serialize } from 'cookie'
import parse from 'set-cookie-parser'

// The vercel API configuration
export const config = {
  api: {
    bodyParser: false
  }
}

const encode = (v: string) => v

/**
 * Creates a NextJS / Vercel API Handler
 *
 * For this handler to work, please set the environment variable `ORY_SDK_URL`.
 */
export function createApiHandler(options: {
  /**
   * If set overrides the API Base URL. Usually, this URL
   * is taken from the ORY_SDK_URL environment variable.
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
}) {
  let baseUrl = ''
  if (process.env.ORY_SDK_URL) {
    baseUrl = process.env.ORY_SDK_URL
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
    req
      .pipe(request(`${baseUrl}/${path}?${search.toString()}`))
      .on('response', (res) => {
        res.headers['set-cookie'] = parse(res)
          .map((cookie) => ({
            ...cookie,
            domain: options.forceCookieDomain,
            secure:
              process.env.VERCEL_ENV !== 'development' ||
              options.forceCookieSecure,
            encode
          }))
          .map(({ value, name, ...options }) =>
            serialize(name, value, options as CookieSerializeOptions)
          )
      })
      .pipe(res)
  }
}
