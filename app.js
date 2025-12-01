if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStoreModule = require("connect-mongo");
const MongoStore = MongoStoreModule.default;
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

mongoose.connect(dbUrl)
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

app.set("trust proxy", 1);  // required for Render

// ❌ REMOVE force HTTPS middleware — Render already handles HTTPS
// ❌ REMOVE HSTS middleware — Render sets this automatically

// ------------------ SESSION ------------------
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: { secret: process.env.SECRET || "mysupersecretcode" },
  touchAfter: 24 * 3600,
});

store.on("error", (e) => {
  console.log("MongoStore Error:", e);
});

app.use(session({
  store,
  secret: process.env.SECRET || "mysupersecretcode",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

// ------------------ PASSPORT ------------------
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

// ------------------ 404 ------------------
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// ------------------ ERROR HANDLER ------------------
app.use((err, req, res, next) => {
  const { status = 500 } = err;
  res.status(status).render("error.ejs", { err });
});

// ------------------ SERVER ------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
