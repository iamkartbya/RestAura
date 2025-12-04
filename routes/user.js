const express = require("express");
const router = express.Router();
const passport = require("passport");
const multer = require("multer");
const { storage } = require("../cloudConfig");
const upload = multer({ storage });

const wrapAsync = require("../Utils/wrapAsync");
const { saveRedirectUrl } = require("../middleware");
const userController = require("../controllers/users");

// ------------------ LOCAL AUTH ------------------
router.route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));

router.route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true
        }),
        userController.login
    );

// ------------------ PROFILE ------------------
// Profile routes
router.get("/profile", userController.showProfile);
router.get("/profile/edit", userController.renderEditProfileForm);
router.put("/profile/:id", upload.single("avatar"), wrapAsync(userController.updateProfile));

// Instant avatar upload (AJAX)
router.post("/profile/avatar", upload.single("avatar"), wrapAsync(userController.uploadAvatar));


// ------------------ LOGOUT ------------------
router.get("/logout", userController.logout);

// ------------------ GOOGLE AUTH ------------------
router.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        req.flash("success", "Logged in with Google!");
        res.redirect("/listings");
    }
);


// ------------------ GITHUB AUTH ------------------
router.get("/auth/github",
    passport.authenticate("github", { scope: ["user:email"] })
);

router.get("/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        req.flash("success", "Logged in with GitHub!");
        res.redirect("/listings");
    }
);

module.exports = router;
