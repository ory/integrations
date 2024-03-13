export function processLocationHeader(
  locationHeaderValue: string,
  baseUrl: string,
) {
  if (locationHeaderValue.startsWith(baseUrl)) {
    return locationHeaderValue.replace(baseUrl, "/api/.ory")
  }

  if (
    locationHeaderValue.startsWith("/api/kratos/public/") ||
    locationHeaderValue.startsWith("/self-service/") ||
    locationHeaderValue.startsWith("/ui/")
  ) {
    return "/api/.ory" + locationHeaderValue
  }

  return locationHeaderValue
}
