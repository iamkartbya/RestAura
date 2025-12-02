const Listing = require("../models/listing");
const { getCoordinates } = require("../Utils/geocoder");


// LISTINGS INDEX
module.exports.index = async (req, res, next) => {
  try {
    const allListings = await Listing.find({});
    return res.render("listings/index", { allListings });
  } catch (err) {
    return next(err);
  }
};

// NEW FORM
module.exports.renderNewForm = (req, res) => {
  return res.render("listings/new.ejs");
};

// SHOW LISTING
module.exports.showListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: { path: "author" }
      })
      .populate("owner");

    if (!listing) {
      req.flash("error", "Listing you requested does not exist.");
      return res.redirect("/listings");
    }

    const ownerListings = await Listing.find({ owner: listing.owner._id });

    return res.render("listings/show", { listing, ownerListings });
  } catch (err) {
    return next(err);
  }
};

// CREATE LISTING
module.exports.createListing = async (req, res, next) => {
  try {
    if (!req.user) {
      req.flash("error", "User not logged in!");
      return res.redirect("/login");
    }

     const geoData = await getCoordinates(req.body.listing.location);

    if (!geoData || geoData.length === 0) {
      req.flash("error", "Invalid location! Could not find coordinates.");
      return res.redirect("/listings/new");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename
      };
    } else {
      newListing.image = {
        url: "/default-image.jpg",
        filename: "default"
      };
    }

     newListing.geometry = {
      type: "Point",
      coordinates: [parseFloat(geoData.lon), parseFloat(geoData.lat)]
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    return res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    return next(err);
  }
};

// RENDER EDIT FORM
module.exports.renderEditForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
  let originalImageUrl=listing.image.url;
    return res.render("listings/edit", { listing,originalImageUrl });
  } catch (err) {
    return next(err);
  }
};

// UPDATE LISTING
module.exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

     // If location changed, update coordinates
    if (req.body.listing.location && req.body.listing.location !== listing.location) {
      const geoData = await getCoordinates(req.body.listing.location);
      if (geoData) {
        listing.geometry = {
          type: "Point",
          coordinates: [parseFloat(geoData.lon), parseFloat(geoData.lat)]
        };
      }
    }
    if (req.file) {
      listing.image = {
        url: req.file.path,
        filename: req.file.filename
      };
      await listing.save();
    }

    req.flash("success", "Listing Updated");
    return res.redirect(`/listings/${id}`);
  } catch (err) {
    return next(err);
  }
};

// DELETE LISTING
module.exports.destroyListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    req.flash("success", "Listing Deleted");
    return res.redirect("/listings");
  } catch (err) {
    return next(err);
  }
};
