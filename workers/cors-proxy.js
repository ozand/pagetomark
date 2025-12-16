/*
CORS Anywhere as a Cloudflare Worker
Modified for PageToMark project
*/

const whitelistOrigins = [".*"]; // Allow all origins
const blacklistUrls = []; // No blacklist

function isListedInWhitelist(uri, listing) {
    let isListed = false;
    if (typeof uri === "string") {
        listing.forEach((pattern) => {
            if (uri.match(pattern) !== null) {
                isListed = true;
            }
        });
    } else {
        isListed = true;
    }
    return isListed;
}

addEventListener("fetch", async event => {
    event.respondWith((async function () {
        const isPreflightRequest = (event.request.method === "OPTIONS");
        const originUrl = new URL(event.request.url);

        function setupCORSHeaders(headers) {
            headers.set("Access-Control-Allow-Origin", event.request.headers.get("Origin") || "*");
            if (isPreflightRequest) {
                headers.set("Access-Control-Allow-Methods", event.request.headers.get("access-control-request-method") || "GET, POST, PUT, DELETE, OPTIONS");
                const requestedHeaders = event.request.headers.get("access-control-request-headers");

                if (requestedHeaders) {
                    headers.set("Access-Control-Allow-Headers", requestedHeaders);
                }

                headers.delete("X-Content-Type-Options");
            }
            return headers;
        }

        const targetUrl = decodeURIComponent(decodeURIComponent(originUrl.search.substr(1)));
        const originHeader = event.request.headers.get("Origin");

        if ((!isListedInWhitelist(targetUrl, blacklistUrls)) && (isListedInWhitelist(originHeader, whitelistOrigins))) {
            let customHeaders = event.request.headers.get("x-cors-headers");

            if (customHeaders !== null) {
                try {
                    customHeaders = JSON.parse(customHeaders);
                } catch (e) { }
            }

            if (originUrl.search.startsWith("?")) {
                const filteredHeaders = {};
                for (const [key, value] of event.request.headers.entries()) {
                    if (
                        (key.match("^origin") === null) &&
                        (key.match("eferer") === null) &&
                        (key.match("^cf-") === null) &&
                        (key.match("^x-forw") === null) &&
                        (key.match("^x-cors-headers") === null)
                    ) {
                        filteredHeaders[key] = value;
                    }
                }

                if (customHeaders !== null) {
                    Object.entries(customHeaders).forEach((entry) => (filteredHeaders[entry[0]] = entry[1]));
                }

                const newRequest = new Request(event.request, {
                    redirect: "follow",
                    headers: filteredHeaders
                });

                const response = await fetch(targetUrl, newRequest);
                let responseHeaders = new Headers(response.headers);
                const exposedHeaders = [];
                const allResponseHeaders = {};
                for (const [key, value] of response.headers.entries()) {
                    exposedHeaders.push(key);
                    allResponseHeaders[key] = value;
                }
                exposedHeaders.push("cors-received-headers");
                responseHeaders = setupCORSHeaders(responseHeaders);

                responseHeaders.set("Access-Control-Expose-Headers", exposedHeaders.join(","));
                responseHeaders.set("cors-received-headers", JSON.stringify(allResponseHeaders));

                const responseBody = isPreflightRequest ? null : await response.arrayBuffer();

                const responseInit = {
                    headers: responseHeaders,
                    status: isPreflightRequest ? 200 : response.status,
                    statusText: isPreflightRequest ? "OK" : response.statusText
                };
                return new Response(responseBody, responseInit);

            } else {
                let responseHeaders = new Headers();
                responseHeaders = setupCORSHeaders(responseHeaders);

                return new Response(
                    "PageToMark CORS Proxy\n\n" +
                    "Usage:\n" +
                    originUrl.origin + "/?target_url\n\n" +
                    "Example:\n" +
                    originUrl.origin + "/?https://example.com\n",
                    {
                        status: 200,
                        headers: responseHeaders
                    }
                );
            }
        } else {
            return new Response(
                "Access Denied",
                {
                    status: 403,
                    statusText: 'Forbidden'
                }
            );
        }
    })());
});
