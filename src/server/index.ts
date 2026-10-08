import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createCatalogue } from "./catalogue.js";
import { FoundryShoppingMissionPlanner } from "./foundry-missions.js";
import { logger } from "./logger.js";

const catalogue = createCatalogue();
const missionPlanner = new FoundryShoppingMissionPlanner();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const staticDirectory =
  process.env.NODE_ENV === "production"
    ? path.resolve(currentDirectory, "../client")
    : undefined;
const app = createApp({ catalogue, missionPlanner, logger, staticDirectory });
const port = Number(process.env.PORT ?? 3000);
const productCount = (await catalogue.list()).length;

app.listen(port, "0.0.0.0", () => {
  logger.log("info", "server_started", {
    port,
    productCount,
  });
});
