import auth from "./auth";
import cors from "cors";

const PORT = process.env.PORT || 3001;

console.log("Starting auth service on port", PORT);

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS for all requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    // Add CORS headers to all responses
    const addCorsHeaders = (response: Response) => {
      const newResponse = new Response(response.body, response);
      newResponse.headers.set(
        "Access-Control-Allow-Origin",
        "http://localhost:3000",
      );
      newResponse.headers.set("Access-Control-Allow-Credentials", "true");
      return newResponse;
    };

    // Health check endpoint
    if (url.pathname === "/health") {
      return addCorsHeaders(
        new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    // Route all auth-related requests to better-auth
    if (url.pathname.startsWith("/api/auth")) {
      // Keep the full path for better-auth
      const authUrl = new URL(url.pathname + url.search, url.origin);

      const authRequest = new Request(authUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      try {
        const response = await auth.handler(authRequest);
        return addCorsHeaders(response);
      } catch (error) {
        console.error("Auth handler error:", error);
        return addCorsHeaders(
          new Response(
            JSON.stringify({
              error: "Internal server error",
              details: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }
    }

    // JWT verification endpoint for the Rust API
    if (url.pathname === "/verify-token" && request.method === "POST") {
      try {
        const body = (await request.json()) as { token?: string };
        const { token } = body;

        if (!token) {
          return addCorsHeaders(
            new Response(JSON.stringify({ error: "Token required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        // Create a mock request to verify the session token
        const verifyRequest = new Request(
          "http://localhost:3001/api/auth/session",
          {
            headers: {
              Cookie: `library-auth.session-token=${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        const sessionResponse = await auth.handler(verifyRequest);
        const session = sessionResponse.ok
          ? ((await sessionResponse.json()) as any)
          : null;

        if (!session?.user) {
          return addCorsHeaders(
            new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        return addCorsHeaders(
          new Response(
            JSON.stringify({
              valid: true,
              user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      } catch (error) {
        console.error("Token verification error:", error);
        return addCorsHeaders(
          new Response(JSON.stringify({ error: "Token verification failed" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
    }

    return addCorsHeaders(new Response("Not Found", { status: 404 }));
  },
});

console.log(`Auth service running on http://localhost:${server.port}`);
