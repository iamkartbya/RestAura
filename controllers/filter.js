const Listing = require("../models/listing");

module.exports.filterListings = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, pets, smoking } = req.query;

    let filters = {};

    // Keyword search
    if (q) {
      const regex = new RegExp(q.trim(), "i");
      filters.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { country: regex },
        { category: regex },
      ];
    }

    // Category filter
    if (category && category !== "All") {
      filters.category = category;
    }

    // Price filter
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = parseInt(minPrice);
      if (maxPrice) filters.price.$lte = parseInt(maxPrice);
    }

    // Pets allowed
    if (pets === "true") filters.petsAllowed = true;

    // Smoking allowed
    if (smoking === "true") filters.smokingAllowed = true;

    const listings = await Listing.find(filters);

    res.render("search/filterResults", {
      listings,
      selectedCategory: category || "All",
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Filtering failed!");
    res.redirect("/listings");
  }
};
