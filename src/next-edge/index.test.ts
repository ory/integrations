import {
  createApiHandler,
  CreateApiHandlerOptions,
  filterRequestHeaders,
  guessCookieDomain,
} from "./index"
import express from "express"
import { NextApiRequest, NextApiResponse } from "next"
import supertest from "supertest"
import parse from "set-cookie-parser"
import http from "http"
import { Application } from "express-serve-static-core"

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
    server: app.listen(),
  }
}

describe("NextJS handler", () => {
  let app: AppResult

  afterEach((done) => {
    app.server.close(done)
  })

  test("returns the revision ID", (done) => {
    app = createApp({
      apiBaseUrlOverride: "https://playground.projects.oryapis.com",
      forceCookieSecure: false,
    })

    supertest(app.app)
      .get("/?paths=revisions&paths=kratos")
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveLength(36)
        done()
      })
      .catch(done)
  })

  test("sets the appropriate cookies", (done) => {
    app = createApp({
      apiBaseUrlOverride: "https://playground.projects.oryapis.com",
    })

    supertest(app.app)
      .get("/?paths=self-service&paths=login&paths=browser")
      .set("Host", "www.example.org")
      .expect(303)
      .then((res) => {
        expect(res.headers["set-cookie"]).toBeDefined()

        const cookies = parse(res.headers["set-cookie"])
        expect(
          cookies.find(({ name }) => name.indexOf("csrf_token") > -1),
        ).toBeDefined()

        cookies.forEach(({ domain, secure }) => {
          expect(domain).toEqual("example.org")
          expect(secure).toBeFalsy()
        })

        done()
      })
      .catch(done)
  })

  test("sets the appropriate cookie domain based on headers", (done) => {
    app = createApp({
      apiBaseUrlOverride: "https://playground.projects.oryapis.com",
    })

    supertest(app.app)
      .get("/?paths=self-service&paths=login&paths=browser")
      .set("Host", "www.example.org")
      .set("X-Forwarded-Host", "www.example.bar")
      .expect(303)
      .then((res) => {
        const cookies = parse(res.headers["set-cookie"])
        cookies.forEach(({ domain, secure }) => {
          expect(domain).toEqual("example.bar")
        })

        done()
      })
      .catch(done)
  })

  test("sets secure true if a TLS connection", (done) => {
    app = createApp({
      apiBaseUrlOverride: "https://playground.projects.oryapis.com",
    })

    supertest(app.app)
      .get("/?paths=self-service&paths=login&paths=browser")
      .set("x-forwarded-proto", "https")
      .expect(303)
      .then((res) => {
        expect(res.headers["set-cookie"]).toBeDefined()

        const cookies = parse(res.headers["set-cookie"])
        expect(
          cookies.find(({ name }) => name.indexOf("csrf_token") > -1),
        ).toBeDefined()

        cookies.forEach(({ domain, secure }) => {
          expect(domain).toBeUndefined()
          expect(secure).toBeTruthy()
        })

        done()
      })
      .catch(done)
  })

  test("uses the options correctly", async () => {
    app = createApp({
      apiBaseUrlOverride: "https://i-do-not-exist.projects.oryapis.com",
      forceCookieSecure: true,
      forceCookieDomain: "some-domain",
    })

    const response = await supertest(app.app)
      .get("/?paths=health&paths=alive")
      .expect(404)
      .then((res) => res)

    expect(response.headers["set-cookie"]).toBeDefined()

    const cookies = parse(response.headers["set-cookie"])
    expect(
      cookies.find(({ name }) => name.indexOf("csrf_token") > -1),
    ).toBeUndefined()

    cookies.forEach(({ domain, secure }) => {
      expect(domain).toBe("some-domain")
      expect(secure).toBeTruthy()
    })
  })

  test("returns the alive status code for the playground", (done) => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    supertest(app.app)
      .get("/?paths=revisions&paths=kratos")
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveLength(36)
        done()
      })
      .catch(done)
  })

  test("updates the redirect location", async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    await supertest(app.app)
      .get("/?paths=ui&paths=login")
      .redirects(0)
      .expect(
        "Location",
        "../self-service/login/browser?aal=&refresh=&return_to=",
      )
      .expect(303)
  })

  test("updates the redirect location with the new schema", async () => {
    app = createApp({
      apiBaseUrlOverride:
        "https://fervent-jang-vww1sezlls.projects.staging.oryapis.dev",
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    await supertest(app.app)
      .get("/?paths=ui&paths=login")
      .redirects(0)
      .expect(
        "Location",
        "../self-service/login/browser?aal=&refresh=&return_to=",
      )
      .expect(303)
  })

  test("redirects home if we end up at the welcome page", async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    await supertest(app.app)
      .get("/?paths=ui&paths=welcome")
      .redirects(0)
      .expect("Location", "../../../")
      .expect(303)
  })

  test("redirects to login if we access settings without a session", async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    await supertest(app.app)
      .get("/?paths=ui&paths=settings")
      .redirects(0)
      .expect("Location", "/api/.ory/self-service/login/browser")
      .expect(302)
  })

  test("updates the contents of JSON", async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    const response = await supertest(app.app)
      .get("/?paths=self-service&paths=login&paths=api")
      .expect(200)
      .then((res) => res.body)

    expect(response.ui.action).toContain("/self-service/login?flow=")
  })

  test("should work with binaries", async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    await supertest(app.app).get("/?paths=ui&paths=ory-small.svg").expect(200)
  })

  test("updates the contents of HTML", async () => {
    app = createApp({
      forceCookieSecure: false,
      fallbackToPlayground: true,
    })

    let response = await supertest(app.app)
      .get("/?paths=self-service&paths=login&paths=browser")
      .expect(303)

    expect(response.headers["location"]).toContain("/api/.ory/ui/login")
    const loc = response.headers["location"]
      .replace("/api/.ory/", "")
      .split("/")
      .map((p: string) => `paths=${p}`)
      .join("&")
      .replace("?flow", "&flow")

    response = await supertest(app.app)
      .get("/?" + loc)
      .set("Cookie", [
        response.headers["set-cookie"]
          .map((c: string) => c.split(";")[0])
          .join(";"),
      ])
      .expect("Content-Type", /text\/html/)
      .expect(200)

    expect(response.text).toContain('action="/api/.ory/self-service/login')
  })
})

describe("cookie guesser", () => {
  test("uses force domain", async () => {
    expect(
      guessCookieDomain("https://localhost", {
        forceCookieDomain: "some-domain",
      }),
    ).toEqual("some-domain")
  })

  test("does not use any guessing domain", async () => {
    expect(
      guessCookieDomain("https://localhost", {
        dontUseTldForCookieDomain: true,
      }),
    ).toEqual(undefined)
  })

  test("is not confused by invalid data", async () => {
    expect(
      guessCookieDomain("5qw5tare4g", {
        dontUseTldForCookieDomain: true,
      }),
    ).toEqual(undefined)
    expect(
      guessCookieDomain("https://123.123.123.123.123", {
        dontUseTldForCookieDomain: true,
      }),
    ).toEqual(undefined)
  })

  test("is not confused by IP", async () => {
    expect(
      guessCookieDomain("https://123.123.123.123", {
        dontUseTldForCookieDomain: true,
      }),
    ).toEqual(undefined)
    expect(
      guessCookieDomain("https://2001:0db8:0000:0000:0000:ff00:0042:8329", {
        dontUseTldForCookieDomain: true,
      }),
    ).toEqual(undefined)
  })

  test("uses TLD", async () => {
    expect(guessCookieDomain("https://foo.localhost", {})).toEqual(
      "foo.localhost",
    )

    expect(guessCookieDomain("https://foo.localhost:1234", {})).toEqual(
      "foo.localhost",
    )

    expect(
      guessCookieDomain(
        "https://spark-public.s3.amazonaws.com/dataanalysis/loansData.csv",
        {},
      ),
    ).toEqual("spark-public.s3.amazonaws.com")

    expect(guessCookieDomain("spark-public.s3.amazonaws.com", {})).toEqual(
      "spark-public.s3.amazonaws.com",
    )

    expect(guessCookieDomain("https://localhost/123", {})).toEqual("localhost")
    expect(guessCookieDomain("https://localhost:1234/123", {})).toEqual(
      "localhost",
    )
  })

  test("filters request headers", async () => {
    const headers = {
      accept: "application/json",
      filtered: "any",
      "x-custom": "some",
    }

    expect(filterRequestHeaders(headers)).toEqual({
      accept: "application/json",
    })

    expect(filterRequestHeaders(headers, ["x-custom"])).toEqual({
      accept: "application/json",
      "x-custom": "some",
    })
  })
})
