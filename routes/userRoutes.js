const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");

router.route("/signup").post(userController.signup);
router.route("/login").post(userController.login);
router.route("/logout").post(userController.protect, userController.logout);
router.route("/fetch").get(userController.protect, userController.fetchUser);
router.route("/update/password").post(userController.protect, userController.updatePass)

module.exports = router;