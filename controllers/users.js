const User = require("../models/user");
const { cloudinary } = require("../cloudConfig");

// ------------------ SIGNUP ------------------
module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup");
};

module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        const newUser = new User({
            username,
            email,
            name: username,
        });

        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome to RestAura Homes!");
            res.redirect("/listings");
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

// ------------------ LOGIN ------------------
module.exports.renderLoginForm = (req, res) => {
    res.render("users/login");
};

module.exports.login = (req, res) => {
    req.flash("success", "Logged in successfully!");
    const redirectUrl = res.locals.redirectUrl || "/listings";
    res.locals.redirectUrl = null;
    res.redirect(redirectUrl);
};

// ------------------ LOGOUT ------------------
module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    });
};

// ------------------ PROFILE ------------------

// Render edit form
module.exports.renderEditProfileForm = async (req, res) => {
  res.render("users/editProfile", { currentUser: req.user });
};

// Show profile
module.exports.showProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.render("users/profile", { currentUser: user });
};

// Update profile (text + avatar)
module.exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, email, bio, language, currency, removeAvatar } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  user.bio = bio || user.bio;
  user.language = language || user.language;
  user.currency = currency || user.currency;

  if (removeAvatar === "1" && user.avatar?.filename) {
    await cloudinary.uploader.destroy(user.avatar.filename);
    user.avatar = undefined;
  }

  if (req.file) {
    if (user.avatar?.filename) await cloudinary.uploader.destroy(user.avatar.filename);
    user.avatar = { url: req.file.path, filename: req.file.filename };
  }

  await user.save();
  req.flash("success", "Profile updated successfully!");
  res.redirect("/profile");
};

// Instant avatar upload
module.exports.uploadAvatar = async (req, res) => {
  try{
  const user = await User.findById(req.user._id);

  if (user.avatar?.filename) await cloudinary.uploader.destroy(user.avatar.filename);

  user.avatar = { url: req.file.path, filename: req.file.filename };
  await user.save();

  res.json({ url: user.avatar.url });
}catch(err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};
