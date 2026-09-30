import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { createServer, type ProxyOptions } from "vite";
import viteConfig from "../vite.config.js";

const upstreamRequests: string[] = [];
let upstream: Server | undefined;
let vite: Awaited<ReturnType<typeof createServer>> | undefined;

afterEach(async () => {
  await vite?.close();
  vite = undefined;
  if (upstream?.listening) {
    await new Promise<void>((resolve, reject) =>
      upstream!.close((error) => (error ? reject(error) : resolve())),
    );
  }
  upstream = undefined;
  upstreamRequests.length = 0;
});

it("serves the api.ts client module while proxying /api endpoints", async () => {
  upstream = createHttpServer((request, response) => {
    upstreamRequests.push(request.url ?? "");
    if (request.url === "/api/feedback") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ items: [] }));
      return;
    }
    response.statusCode = 404;
    response.setHeader("content-type", "text/html");
    response.end("not found");
  });
  await new Promise<void>((resolve) => upstream!.listen(0, "127.0.0.1", resolve));
  const upstreamPort = (upstream.address() as AddressInfo).port;
  const proxy = Object.fromEntries(
    Object.entries(viteConfig.server?.proxy ?? {}).map(([route, options]) => [
      route,
      typeof options === "string"
        ? `http://127.0.0.1:${upstreamPort}`
        : ({ ...options, target: `http://127.0.0.1:${upstreamPort}` } satisfies ProxyOptions),
    ]),
  );

  vite = await createServer({
    ...viteConfig,
    configFile: false,
    root: resolve(import.meta.dirname, "../src/client"),
    server: {
      ...viteConfig.server,
      host: "127.0.0.1",
      port: 0,
      proxy,
    },
  });
  await vite.listen();

  const address = vite.httpServer?.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const clientModule = await fetch(`${baseUrl}/api.ts`);
  const apiResponse = await fetch(`${baseUrl}/api/feedback`);

  expect(clientModule.status).toBe(200);
  expect(clientModule.headers.get("content-type")).toContain("javascript");
  expect(await clientModule.text()).toContain("ApiRequestError");
  expect(apiResponse.status).toBe(200);
  expect(await apiResponse.json()).toEqual({ items: [] });
  expect(upstreamRequests).toEqual(["/api/feedback"]);
});
