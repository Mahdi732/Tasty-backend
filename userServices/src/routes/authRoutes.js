import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { AuthService } from "../services/AuthService.js";
import { User } from "../models/User.js";
import { registerValidation, loginValidation } from "../validations/authValidation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();
const authController = new AuthController(new AuthService(User));

router.post("/register", authLimiter, registerValidation, validateRequest, authController.register);
router.post("/login", authLimiter, loginValidation, validateRequest, authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);

export const authRouter = router;