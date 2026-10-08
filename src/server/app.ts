import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import {
  productCategories,
  productQuerySchema,
  shoppingMissionRequestSchema,
  type ApiError,
} from "../shared/contracts.js";
import * as missionPlannerTypes from "./foundry-missions.js";
import { logger as defaultLogger, type Logger } from "./logger.js";
import {
  ProductNotFoundError,
  type ProductCatalogue,
} from "./catalogue.js";
import { MissionProposalValidationError, validateMissionProposal } from "./missions.js";

export interface AppOptions {
  catalogue: ProductCatalogue;
  missionPlanner?: missionPlannerTypes.ShoppingMissionPlanner;
  logger?: Logger;
  staticDirectory?: string;
}

export const createApp = ({
  catalogue,
  missionPlanner,
  logger = defaultLogger,
  staticDirectory,
}: AppOptions) => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));
  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") ?? randomUUID();
    response.setHeader("x-request-id", requestId);
    const startedAt = performance.now();
    response.on("finish", () => {
      logger.log("info", "http_request", {
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });
    next();
  });
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (request) => request.path === "/health",
      handler: (_request, response) => {
        response.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again shortly.",
          },
        } satisfies ApiError);
      },
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ status: "healthy" });
  });

  app.get("/ready", async (_request, response) => {
    try {
      await catalogue.checkHealth();
      response.json({ status: "ready" });
    } catch (error) {
      logger.log("error", "readiness_failed", {
        error: error instanceof Error ? error.message : "Unknown catalogue error",
      });
      response.status(503).json({
        status: "not_ready",
        error: {
          code: "CATALOGUE_UNAVAILABLE",
          message: "The product catalogue is unavailable.",
        },
      });
    }
  });

  app.get("/api/products", async (request, response) => {
    const query = productQuerySchema.parse({
      q: typeof request.query.q === "string" ? request.query.q : undefined,
      category:
        typeof request.query.category === "string"
          ? request.query.category
          : undefined,
    });
    const items = await catalogue.list(query);
    response.json({
      items,
      total: items.length,
      query,
      categories: productCategories,
    });
  });

  app.get("/api/products/:id", async (request, response) => {
    response.json({ product: await catalogue.getById(request.params.id) });
  });

  const missionRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 12,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        error: {
          code: "MISSION_RATE_LIMITED",
          message: "Too many shopping mission requests. Try again shortly.",
        },
      } satisfies ApiError);
    },
  });

  app.post(
    "/api/shopping-missions",
    missionRateLimit,
    async (request, response) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      request.once("aborted", abort);
      response.once("close", () => {
        if (!response.writableEnded) abort();
      });
      const mission = shoppingMissionRequestSchema.parse(request.body);
      if (!missionPlanner) {
        response.status(503).json({
          error: {
            code: "MISSION_PLANNER_UNCONFIGURED",
            message: "Shopping mission planning is not configured.",
          },
        } satisfies ApiError);
        return;
      }

      try {
        const products = await catalogue.list();
        const proposal = await missionPlanner.plan(
          mission,
          products,
          controller.signal,
        );
        const plan = await validateMissionProposal(mission, proposal, catalogue);
        response.json({ plan });
      } catch (error) {
        if (
          error instanceof
          missionPlannerTypes.ShoppingMissionPlannerUnconfiguredError
        ) {
          response.status(503).json({
            error: {
              code: "MISSION_PLANNER_UNCONFIGURED",
              message: "Shopping mission planning is not configured.",
            },
          } satisfies ApiError);
          return;
        }
        if (
          error instanceof
          missionPlannerTypes.ShoppingMissionPlannerUnavailableError
        ) {
          logger.log("warn", "mission_planner_unavailable");
          response.status(502).json({
            error: {
              code: "MISSION_PLANNER_UNAVAILABLE",
              message: "Shopping mission planning is temporarily unavailable.",
            },
          } satisfies ApiError);
          return;
        }
        if (
          error instanceof
            missionPlannerTypes.ShoppingMissionPlannerInvalidResponseError ||
          error instanceof MissionProposalValidationError ||
          error instanceof ZodError
        ) {
          logger.log("warn", "mission_proposal_invalid");
          response.status(502).json({
            error: {
              code: "MISSION_PROPOSAL_INVALID",
              message: "The shopping mission response could not be validated.",
            },
          } satisfies ApiError);
          return;
        }
        throw error;
      }
    },
  );

  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get("*splat", (_request, response) => {
      response.sendFile("index.html", { root: staticDirectory });
    });
  }

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ProductNotFoundError) {
      response.status(404).json({
        error: { code: "NOT_FOUND", message: "Product was not found." },
      } satisfies ApiError);
      return;
    }
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = String(issue.path[0] ?? "request");
        (fieldErrors[field] ??= []).push(issue.message);
      }
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the search filters and try again.",
          fieldErrors,
        },
      } satisfies ApiError);
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({
        error: { code: "INVALID_JSON", message: "Request body must be valid JSON." },
      } satisfies ApiError);
      return;
    }
    logger.log("error", "request_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "The request could not be completed." },
    } satisfies ApiError);
  };
  app.use(errorHandler);

  return app;
};
