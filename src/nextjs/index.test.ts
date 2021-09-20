import { createApiHandler, CreateApiHandlerOptions } from './index'
import express from 'express'
import { NextApiRequest, NextApiResponse } from 'next'
import request from 'supertest'
import parse from 'set-cookie-parser'
import http from 'http'
import { Application } from 'express-serve-static-core'

interface AppResult {
  app: Application
  server: http.Server
}

function createApp(options: CreateApiHandlerOptions): AppResult {
  const app = express()

  const handler = createApiHandler(options)
  const router = express.Router()
  router.use((req, res) => {
    handler(req as any as NextApiRequest, res as any as NextApiResponse)
  })

  app.use(router)

  return {
    app,
    server: app.listen()
  }
}

describe('NextJS handler', () => {
  let app: AppResult

  afterEach(() => {
    app?.server.close()
  })

  test('returns the alive status code', async () => {
    app = createApp({
      apiBaseUrlOverride: 'https://playground.projects.oryapis.com',
      forceCookieSecure: false
    })

    const response = await request(app.app).get(
      '/?paths=api&paths=kratos&paths=public&paths=health&paths=alive'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.headers['set-cookie']).toBeDefined()

    const cookies = parse(response.headers['set-cookie'])
    expect(
      cookies.find(({ name }) => name.indexOf('csrf_token') > -1)
    ).toBeDefined()

    cookies.forEach(({ domain, secure }) => {
      expect(domain).toBeUndefined()
      expect(secure).toBeFalsy()
    })
  })

  test('uses the options correctly', async () => {
    app = createApp({
      apiBaseUrlOverride: 'https://i-do-not-exist.projects.oryapis.com',
      forceCookieSecure: true,
      forceCookieDomain: 'some-domain'
    })

    const response = await request(app.app).get(
      '/?paths=api&paths=kratos&paths=public&paths=health&paths=alive'
    )

    expect(response.statusCode).toBe(404)
    expect(response.headers['set-cookie']).toBeDefined()

    const cookies = parse(response.headers['set-cookie'])
    expect(
      cookies.find(({ name }) => name.indexOf('csrf_token') > -1)
    ).toBeUndefined()

    cookies.forEach(({ domain, secure }) => {
      expect(domain).toBe('some-domain')
      expect(secure).toBeTruthy()
    })
  })
})
