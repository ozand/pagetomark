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

export default {
    async fetch(request, env, ctx) {
        try {
            const isPreflightRequest = (request.method === "OPTIONS");
            const originUrl = new URL(request.url);

            function setupCORSHeaders(headers) {
                headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
                if (isPreflightRequest) {
                    headers.set("Access-Control-Allow-Methods", request.headers.get("access-control-request-method") || "GET, POST, PUT, DELETE, OPTIONS");
                    const requestedHeaders = request.headers.get("access-control-request-headers");

                    if (requestedHeaders) {
                        headers.set("Access-Control-Allow-Headers", requestedHeaders);
                    }

                    headers.delete("X-Content-Type-Options");
                }
                return headers;
            }

            // Fixed: remove double decoding and handle empty search string
            const targetUrl = originUrl.search.length > 1 ? decodeURIComponent(originUrl.search.substring(1)) : "";
            const originHeader = request.headers.get("Origin");

            // Validate target URL
            if (targetUrl && !targetUrl.match(/^https?:\/\//)) {
                return new Response(
                    `Invalid URL: ${targetUrl}\n\nPlease provide a full URL with http:// or https:// protocol.`,
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'text/plain',
                            'Access-Control-Allow-Origin': '*'
                        }
                    }
                );
            }

            // Show usage if no target URL provided
            if (!targetUrl || targetUrl.length === 0) {
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

            if ((!isListedInWhitelist(targetUrl, blacklistUrls)) && (isListedInWhitelist(originHeader, whitelistOrigins))) {
                let customHeaders = request.headers.get("x-cors-headers");

                if (customHeaders !== null) {
                    try {
                        customHeaders = JSON.parse(customHeaders);
                    } catch (e) { }
                }

                const filteredHeaders = {};
                for (const [key, value] of request.headers.entries()) {
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

                const newRequest = new Request(targetUrl, {
                    method: request.method,
                    headers: filteredHeaders,
                    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
                    redirect: "follow"
                });

                const response = await fetch(newRequest);
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
                return new Response(
                    "Access Denied",
                    {
                        status: 403,
                        statusText: 'Forbidden'
                    }
                );
            }
        } catch (error) {
            return new Response(
                `Error: ${error.message}\nStack: ${error.stack}`,
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }
    }
};
