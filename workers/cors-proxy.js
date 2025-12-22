/*
CORS Anywhere as a Cloudflare Worker
Modified for PageToMark project
*/

export default {
    async fetch(request, env, ctx) {
        try {
            const isPreflightRequest = (request.method === "OPTIONS");
            const originUrl = new URL(request.url);

            function setupCORSHeaders(headers) {
                headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
                if (isPreflightRequest) {
                    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    headers.set("Access-Control-Allow-Headers", request.headers.get("access-control-request-headers") || "*");
                    headers.set("Access-Control-Max-Age", "86400");
                }
                return headers;
            }

            // Handle preflight requests
            if (isPreflightRequest) {
                return new Response(null, {
                    status: 204,
                    headers: setupCORSHeaders(new Headers())
                });
            }

            // Get target URL from query string
            const targetUrl = originUrl.search.length > 1 ? decodeURIComponent(originUrl.search.substring(1)) : "";

            // Validate target URL
            if (!targetUrl || targetUrl.length === 0) {
                const responseHeaders = setupCORSHeaders(new Headers());
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

            if (!targetUrl.match(/^https?:\/\//)) {
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

            // Prepare headers for proxied request
            const filteredHeaders = new Headers();
            for (const [key, value] of request.headers.entries()) {
                // Filter out headers that should not be forwarded
                if (
                    !key.startsWith('cf-') &&
                    !key.startsWith('x-forw') &&
                    key !== 'origin' &&
                    key !== 'referer' &&
                    key !== 'x-cors-headers'
                ) {
                    filteredHeaders.set(key, value);
                }
            }

            // Make the proxied request
            const proxyResponse = await fetch(targetUrl, {
                method: request.method,
                headers: filteredHeaders,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
                redirect: "follow"
            });

            // Prepare response headers with CORS
            const responseHeaders = setupCORSHeaders(new Headers(proxyResponse.headers));

            // Add exposed headers
            const exposedHeaders = [];
            for (const [key] of proxyResponse.headers.entries()) {
                exposedHeaders.push(key);
            }
            responseHeaders.set("Access-Control-Expose-Headers", exposedHeaders.join(","));

            // Return proxied response
            return new Response(proxyResponse.body, {
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                headers: responseHeaders
            });

        } catch (error) {
            return new Response(
                `Proxy Error: ${error.message}\n\nStack: ${error.stack}`,
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
