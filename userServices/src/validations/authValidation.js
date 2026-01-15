import { body } from "express-validator";

export const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .trim()
    .normalizeEmail({ gmail_remove_dots: false })
    .isEmail()
    .isLength({ max: 254 })
    .withMessage("Invalid email"),
  body("password")
    .isString()
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage("Password must include upper, lower, number, and symbol")
];

export const loginValidation = [
  body("email").trim().normalizeEmail({ gmail_remove_dots: false }).isEmail().withMessage("Invalid email"),
  body("password").isString().isLength({ min: 8 }).withMessage("Password required")
];
