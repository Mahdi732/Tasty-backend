import { verifyAccessToken } from "../utils/token.js";
import { AppError } from "../utils/errors.js";

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }
  const token = header.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") {
      return next(new AppError("Unauthorized", 401));
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(new AppError("Unauthorized", 401));
  }
};
