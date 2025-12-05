const Listing = require("../models/listing");

module.exports.searchHotels = async (req, res) => {
  try {
    let q = req.query.q?.toLowerCase().trim();
    if (!q) return res.redirect("/listings");

    let andFilters = [];
    let orFilters = [];

    orFilters.push(
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { country: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } }
    );

    if (q.includes("under") || q.includes("below")) {
      let price = parseInt(q.replace(/\D/g, ""));
      if (!isNaN(price)) {
        andFilters.push({ price: { $lte: price } });
      }
    }


    const categories = [
      "room",
      "iconic cities",
      "mountains",
      "castle",
      "arctic",
      "camping",
      "farms",
      "desert",
      "domes",
      "boats"
    ];

    categories.forEach((cat) => {
      if (q.includes(cat.toLowerCase())) {
        andFilters.push({ category: { $regex: cat, $options: "i" } });
      }
    });

 
    if (q.includes("pet") || q.includes("pets allowed")) {
      andFilters.push({ petsAllowed: true });
    }

 
    if (q.includes("smoking") || q.includes("smoke")) {
      andFilters.push({ smokingAllowed: true });
    }

    let finalFilter = {
      $and: [
        { $or: orFilters },
        ...andFilters
      ]
    };

    const listings = await Listing.find(finalFilter);

    res.render("search/results", {
      listings,
      query: req.query.q,
    });

  } catch (err) {
    console.log(err);
    req.flash("error", "Search failed!");
    res.redirect("/listings");
  }
};
