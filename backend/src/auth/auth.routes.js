const express = require("express");

const router = express.Router();

const authController = require("./auth.controller");

const {
    registerValidation,
    loginValidation
} = require("./auth.validator");

const validate = require("../middleware/validation.middleware");

const authMiddleware = require("../middleware/auth.middleware");

router.post(
    "/register",
    registerValidation,
    validate,
    authController.register
);

router.post(
    "/login",
    loginValidation,
    validate,
    authController.login
);

router.get(
    "/me",
    authMiddleware,
    authController.me
);

module.exports = router;