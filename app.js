// ------------------ ENVIRONMENT ------------------
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config(); // load .env locally
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user");
const listingsRouter = require("./routes/listing");
const reviewsRouter = require("./routes/review");
const userRouter = require("./routes/user");
const ExpressError = require("./Utils/ExpressError.js");

// ------------------ MONGODB ATLAS ------------------
const dbUrl = process.env.ATLASDB_URL;
if (!dbUrl) {
  console.error("ERROR: ATLASDB_URL not defined!");
  process.exit(1);
}

mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));

// ------------------ VIEW ENGINE ------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ------------------ MIDDLEWARE ------------------
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", 1); // for secure cookies behind proxy (Render)

// ------------------ SESSION SETUP (async import for connect-mongo v6) ------------------
const sessionSecret = process.env.SECRET || "mysupersecretcode";

(async () => {
  // Dynamic import for connect-mongo v6 (ESM)
  const MongoStore = (await import("connect-mongo")).default;

  const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: { secret: sessionSecret },
    touchAfter: 24 * 3600 // seconds
  });

  store.on("error", (err) => console.error("MongoStore Error:", err));

  app.use(session({
    store,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));

  // ------------------ FLASH & PASSPORT ------------------
  app.use(flash());

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(User.authenticate()));
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  // ------------------ GLOBAL LOCALS ------------------
  app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  });

  // ------------------ ROUTES ------------------
  app.use("/listings", listingsRouter);
  app.use("/listings/:id/reviews", reviewsRouter);
  app.use("/", userRouter);

  // ------------------ HOME ROUTE ------------------
  app.get("/", (req, res) => {
    res.redirect("/listings");
  });

  // ------------------ 404 HANDLER ------------------
 app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

  // ------------------ ERROR HANDLER ------------------
  app.use((err, req, res, next) => {
    const { status = 500 } = err;
    res.status(status).render("error", { err });
  });

  // ------------------ SERVER ------------------
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

})();
