const { body } = require("express-validator");

exports.registerValidation = [

    body("fullName")
        .trim()
        .isLength({ min: 3 }),

    body("email")
        .isEmail()
        .normalizeEmail(),

    body("password")
        .isLength({ min: 8 })

];