/**
 * SDK configuration for using the ory-next library.
 */
import getConfig from "next/config"
const { basePath } = getConfig() || { basePath: "" }

export const edgeConfig = {
  basePath: `${basePath}/api/.ory`,
  baseOptions: {
    withCredentials: true,
  },
}
