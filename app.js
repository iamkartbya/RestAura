// ------------------ ENVIRONMENT ------------------
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { Server } = require("socket.io");

const User = require("./models/user");
const listingsRouter = require("./routes/listing");
const reviewsRouter = require("./routes/review");
const userRouter = require("./routes/user");
const ExpressError = require("./Utils/ExpressError.js");
const searchRoute = require("./routes/search");
const filterRoutes = require("./routes/filter");

const PORT = process.env.PORT || 8080;

// ------------------ MONGODB ATLAS ------------------
const dbUrl = process.env.ATLASDB_URL;
if (!dbUrl) {
    console.error("ERROR: ATLASDB_URL not defined!");
    process.exit(1);
}

mongoose.connect(dbUrl)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("MongoDB connection error:", err));

// ------------------ SESSION STORE (Define BEFORE usage) ------------------
const sessionSecret = process.env.SECRET || "mysupersecretcode";
const MongoStore = require("connect-mongo");
const { filterListings } = require("./controllers/filter.js");

const store = MongoStore.default.create({
    mongoUrl: dbUrl,
    crypto: { secret: sessionSecret },
    touchAfter: 24 * 3600
});

store.on("error", e => console.log("MongoStore Error:", e));

// ------------------ SESSION MIDDLEWARE ------------------
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


// ------------------ GOOGLE ------------------
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET_KEY,
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                username: profile.displayName,
                googleId: profile.id,
                email: profile.emails[0].value
            });
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

// ------------------ GITHUB ------------------
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_SECRET_KEY,
    callbackURL: "/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
            user = await User.create({
                username: profile.username,
                githubId: profile.id,
                email: profile.emails[0]?.value || ""
            });
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

// ------------------ GLOBAL LOCALS ------------------
app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;  // <-- fixes navbar error
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

// ------------------ VIEW ENGINE ------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ------------------ MIDDLEWARE ------------------
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", 1);  // render.com stuff

// ------------------ ROUTES ------------------
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);
app.use("/search", searchRoute);
app.use("/filter", filterRoutes);
// ------------------ HOME ROUTE ------------------
app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.get('/privacy', (req, res) => {
  res.render('html/privacy');  // correct relative path
});

app.get('/terms', (req, res) => {
  res.render('html/terms');    // correct relative path
});


// ------------------ SOCKET.IO ------------------
const io = new Server(server);
app.set("io", io);

io.on("connection", socket => {
    console.log("🔵 Client connected:", socket.id);
});

// helper function for live updates
async function emitListingUpdate(listing) {
    const io = app.get("io");
    io.emit("listingLocationUpdated", {
        id: listing._id.toString(),
        title: listing.title,
        location: listing.location,
        coordinates: listing.geometry.coordinates
    });
}

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
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
