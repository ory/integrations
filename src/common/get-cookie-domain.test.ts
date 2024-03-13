import { guessCookieDomain } from "./get-cookie-domain"

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
})
