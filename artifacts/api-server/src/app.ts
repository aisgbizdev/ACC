import express, { type Express, type NextFunction, type Request, type Response } from "express";
import path from "path";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production.");
  }
  logger.warn("SESSION_SECRET is not set — using insecure default (development only).");
}

const cookieSecure =
  process.env.COOKIE_SECURE === "true"
    ? true
    : process.env.COOKIE_SECURE === "false"
      ? false
      : process.env.NODE_ENV === "production";

if (cookieSecure) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: sessionSecret ?? "acc-secret-key-dev-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

app.use("/api", router);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode ?? 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  logger.error({ err, req: { method: req.method, url: req.url } }, "Unhandled error");
  res.status(status).json({ error: message });
});

export default app;
