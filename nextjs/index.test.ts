import { createMocks } from 'node-mocks-http'
import { createApiHandler } from './index'

describe('NextJS handler', () => {
  test('returns the alive status code', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        paths: ['api/kratos/public/health/alive']
      }
    })

    await createApiHandler({
      apiBaseUrlOverride: 'https://playground.projects.oryapis.com'
    })(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'Your favorite animal is dog'
      })
    )
  })
})
