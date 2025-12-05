const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filter");

// GET /filter?category=Room&minPrice=0...
router.get("/", filterController.filterListings);

module.exports = router;
