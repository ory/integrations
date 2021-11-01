import { createApiHandler, CreateApiHandlerOptions } from './index'
import express from 'express'
import { NextApiRequest, NextApiResponse } from 'next'
import supertest from 'supertest'
import request from 'request'
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

    const response = await supertest(app.app).get(
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

    const response = await supertest(app.app).get(
      '/?paths=api&paths=kratos&paths=public&paths=health&paths=alive'
    )

    console.log(response.body, response.headers, response.statusCode)

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

  test('returns the alive status code for the playground', async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true
    })

    const response = await supertest(app.app).get(
      '/?paths=api&paths=kratos&paths=public&paths=health&paths=alive'
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('ok')
  })

  test('updates the redirect location', async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true
    })

    const response = await supertest(app.app)
      .get('/?paths=ui&paths=login')
      .redirects(0)
      .expect(
        'Location',
        '/api/.ory/api/kratos/public/self-service/login/browser'
      )
      .expect(303)
  })

  test('updates the contents of JSON', async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true
    })

    const response = await supertest(app.app)
      .get(
        '/?paths=api&paths=kratos&paths=public&paths=self-service&paths=login&paths=api'
      )
      .expect(200)
      .then((res) => res.body)

    expect(response.ui.action).toContain(
      '/api/.ory/api/kratos/public/self-service/login?flow='
    )
  })

  test('updates the contents of HTML', async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true
    })

    let response = await supertest(app.app)
      .get(
        '/?paths=api&paths=kratos&paths=public&paths=self-service&paths=login&paths=browser'
      )
      .expect(303)

    expect(response.headers['location']).toContain('/api/.ory/ui/login')
    const loc = response.headers['location']
      .replaceAll('/api/.ory/', '')
      .split('/')
      .map((p: string) => `paths=${p}`)
      .join('&')
      .replace('?flow', '&flow')

    response = await supertest(app.app)
      .get('/?' + loc)
      .set('Cookie', [
        response.headers['set-cookie']
          .map((c: string) => c.split(';')[0])
          .join(';')
      ])
      .expect('Content-Type', /text\/html/)
      .expect(200)

    expect(response.text).toContain(
      'action="/api/.ory/api/kratos/public/self-service/login'
    )
  })
})
