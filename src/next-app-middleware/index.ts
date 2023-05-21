import { NextRequest, NextResponse } from "next/server";
import { AxiosError } from "axios";

export function filterRequestHeaders(
    headers: Headers,
    forwardAdditionalHeaders?: string[]
): Headers {
    const defaultForwardedHeaders = [
        "accept",
        "accept-charset",
        "accept-encoding",
        "accept-language",
        "authorization",
        "cache-control",
        "content-type",
        "cookie",
        "host",
        "user-agent",
        "referer",
    ];

    const filteredHeaders = new Headers();
    headers.forEach((value, key) => {
        const isValid =
            defaultForwardedHeaders.includes(key) ||
            (forwardAdditionalHeaders ?? []).includes(key);
        if (isValid) filteredHeaders.set(key, value);
    });

    return filteredHeaders;
}

export async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith("/api/.ory")) {
        const url = request.nextUrl;
        const flow = url.searchParams.get("flow");
        const aal2 = url.searchParams.get("aal2");
        const aal = url.searchParams.get("aal") ?? aal2 ? "aal2" : "aal1";
        const refresh = url.searchParams.get("refresh") ?? "true";
        const returnTo = url.searchParams.get("return_to") ?? "";
        const loginChallenge = url.searchParams.get("login_challenge");
        const initFlowQuery = new URLSearchParams({
            aal,
            refresh,
            return_to: returnTo,
        });

        if (loginChallenge) {
            initFlowQuery.set("login_challenge", loginChallenge);
        }

        const path = request.nextUrl.pathname.replace("/api/.ory", "");
        const flowUrl = new URL(
            `${process.env.ORY_SDK_URL}${path}${request.nextUrl.search}`
        );

        if (!flow) {
            return NextResponse.redirect(flowUrl.toString());
        }

        try {
            const body = await request.json();

            const headers = filterRequestHeaders(request.headers);
            headers.set("X-Ory-Base-URL-Rewrite", "false");
            headers.set("Ory-Base-URL-Rewrite", "false");
            headers.set("Ory-No-Custom-Domain-Redirect", "true");

            return fetch(flowUrl.toString(), {
                method: request.method,
                headers,
                body: JSON.stringify(body),
            });
        } catch (e) {
            if (e instanceof AxiosError) {
                return new Response(JSON.stringify({ message: e.message }), {
                    status: e.response?.status ?? 500,
                });
            }

            return new Response(JSON.stringify({ message: "unknow error" }), {
                status: 500,
            });
        }
    }
}
