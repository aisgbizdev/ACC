import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

type EnvMap = Record<string, string>;

const rootDir = path.resolve(import.meta.dirname, "..", "..");

function parseDotEnv(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) return {};

  const result: EnvMap = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function createEnv(): NodeJS.ProcessEnv {
  const fileEnv = parseDotEnv(path.join(rootDir, ".env"));
  const merged = {
    ...fileEnv,
    ...process.env,
  };

  const apiPort = merged.API_PORT ?? "8080";
  const webPort = merged.WEB_PORT ?? merged.PORT ?? "5173";
  const basePath = merged.BASE_PATH ?? "/";
  const nodeEnv = merged.NODE_ENV ?? "development";
  const cookieSecure =
    merged.COOKIE_SECURE ?? (nodeEnv === "production" ? "true" : "false");

  return {
    ...process.env,
    ...fileEnv,
    NODE_ENV: nodeEnv,
    API_PORT: apiPort,
    WEB_PORT: webPort,
    BASE_PATH: basePath,
    COOKIE_SECURE: cookieSecure,
  };
}

function spawnProcess(
  label: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): ChildProcess {
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
      return;
    }
    if ((code ?? 0) !== 0) {
      console.log(`[${label}] exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });

  return child;
}

const env = createEnv();
const children: ChildProcess[] = [];

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

console.log(
  `Starting ACC dev servers: api=${env.API_PORT} web=${env.WEB_PORT} env=${env.NODE_ENV}`,
);

children.push(
  spawnProcess(
    "api-build",
    "corepack",
    ["pnpm", "--filter", "@workspace/api-server", "run", "build"],
    {
      ...env,
      PORT: env.API_PORT,
    },
  ),
);

children[0]?.on("exit", (code) => {
  if ((code ?? 0) !== 0) return;

  children.push(
    spawnProcess(
      "api",
      "node",
      ["--enable-source-maps", "artifacts/api-server/dist/index.mjs"],
      {
        ...env,
        PORT: env.API_PORT,
      },
    ),
  );

  children.push(
    spawnProcess(
      "web",
      "corepack",
      ["pnpm", "--filter", "@workspace/acc-dashboard", "run", "dev"],
      {
        ...env,
        PORT: env.WEB_PORT,
      },
    ),
  );
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
