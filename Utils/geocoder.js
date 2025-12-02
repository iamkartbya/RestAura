async function getCoordinates(address) {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: address, format: "json", limit: 1 },
      headers: { "User-Agent": "MyAirbnbApp/1.0 (myemail@domain.com)" }
    });

    if (!response.data || response.data.length === 0) return null;

    const { lat, lon, display_name } = response.data[0];
    return { lat, lon, display_name }; 
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}
module.exports = { getCoordinates };
