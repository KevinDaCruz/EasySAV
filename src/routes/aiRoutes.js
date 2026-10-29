import { Router } from "express";
import { saveMemory, testAi } from "../controllers/aiController.js";

const router = Router();

router.post("/test", testAi);
router.post("/memory", saveMemory);

export default router;
