import { Router } from "express";
import * as assetsController from "../controllers/assets.controller";

const router = Router();

router.get("/", assetsController.listAssets);
router.post("/", assetsController.registerAsset);
router.get("/:tag", assetsController.getAsset);
router.patch("/:tag", assetsController.updateAsset);
router.get("/:tag/history", assetsController.getAssetHistory);

export default router;
