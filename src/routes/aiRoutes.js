import { Router } from "express";
import { testAi } from "../controllers/aiController.js";

const router = Router();

router.post("/test", testAi);

export default router;
