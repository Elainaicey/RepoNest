import http from "node:http";
import { spawn } from "node:child_process";

const publicPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const webPort = 3001;
const apiPort = 4000;
let stopping = false;

function start(name, entrypoint, cwd, env) {
  const child = spawn(process.execPath, [entrypoint], {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit"
  });

  child.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(
      `[RepoNest] ${name} stopped unexpectedly (${signal ?? `exit ${code ?? 1}`}).`
    );
    void shutdown(code ?? 1);
  });
  return child;
}

const api = start("API", "/app/api/dist/index.js", "/app/api", {
  HOST: "127.0.0.1",
  PORT: String(apiPort)
});
const web = start("Web", "/app/web/server.js", "/app/web", {
  HOSTNAME: "127.0.0.1",
  PORT: String(webPort)
});
const children = [api, web];

const proxy = http.createServer((request, response) => {
  const path = request.url ?? "/";
  const targetPort = path === "/api" || path.startsWith("/api/") ? apiPort : webPort;
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      method: request.method,
      path,
      headers: {
        ...request.headers,
        "x-forwarded-host": request.headers["x-forwarded-host"] ?? request.headers.host,
        "x-forwarded-proto": request.headers["x-forwarded-proto"] ?? "http"
      }
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );

  upstream.on("error", (error) => {
    console.error(`[RepoNest] Upstream request failed: ${error.message}`);
    if (!response.headersSent) {
      response.writeHead(503, { "content-type": "application/json" });
    }
    response.end('{"error":"service_unavailable"}');
  });
  request.pipe(upstream);
});

proxy.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

proxy.listen(publicPort, "0.0.0.0", () => {
  console.log(`[RepoNest] Ready on http://0.0.0.0:${publicPort}`);
});

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  await new Promise((resolve) => proxy.close(resolve));
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  const timeout = setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill("SIGKILL");
    }
  }, 10_000);
  timeout.unref();
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) resolve(undefined);
          else child.once("exit", resolve);
        })
    )
  );
  clearTimeout(timeout);
  process.exitCode = exitCode;
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
