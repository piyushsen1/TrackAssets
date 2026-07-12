import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`AssetFlow API listening on port ${env.port}`);
});
