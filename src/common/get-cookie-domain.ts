import tldjs from "tldjs"
import { CreateApiHandlerOptions } from "./get-base-url"

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
