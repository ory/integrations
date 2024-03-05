import { type CreateApiHandlerOptions } from "../type/create-api-handler-options"

export function getBaseUrl(options: CreateApiHandlerOptions) {
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
export { CreateApiHandlerOptions }
