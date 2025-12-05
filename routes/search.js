const express = require("express");
const router = express.Router();
const searchController = require("../controllers/search");

// GET /search?q=...
router.get("/", searchController.searchHotels);

module.exports = router;
