function initMap(listings, currentListingId, mapCenter = [20.5937, 78.9629]) {
  if (!listings || listings.length === 0) return;

  const map = L.map('map').setView(mapCenter, 12);
  let userMarker = null;
  let routeLine = null;

  // Tile Layer
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: "abcd",
    maxZoom: 18
  }).addTo(map);

  // Icons
  const currentIcon = L.icon({ iconUrl: '/image/pin.png', iconSize: [35,40], iconAnchor:[17,40], popupAnchor:[0,-35] });
  const otherIcon = L.icon({ iconUrl: '/image/gps.png', iconSize: [35,40], iconAnchor:[17,40], popupAnchor:[0,-35] });

  // Add markers
  const markers = listings.map(l => {
    const icon = l.id === currentListingId ? currentIcon : otherIcon;
    return {
      ...l,
      marker: L.marker(l.coordinates, { icon }).addTo(map).bindPopup(
        `<strong>${l.title}</strong><br>${l.location || "Location unavailable"}`
      )
    };
  });

  // Center map on current listing
  const currentListing = markers.find(l => l.id === currentListingId);
  if (currentListing) map.setView(currentListing.coordinates, 12);

  // Socket for live updates
  const socket = io();
  socket.on("listingLocationUpdated", data => {
    const listing = markers.find(m => m.id === data.id);
    if (!listing || !data.coordinates) return;
    const [lng, lat] = data.coordinates;
    listing.marker.setLatLng([lat, lng])
      .bindPopup(`<strong>${data.title}</strong><br>${data.location || "Location unavailable"}`);
    if (data.id === currentListingId) map.setView([lat, lng], 12);
  });

  // Find Nearest Hotels
  const findBtn = document.getElementById("findNearestBtn");
  if (findBtn) {
    findBtn.addEventListener("click", () => {
      if (!navigator.geolocation) return alert("Geolocation not supported");

      navigator.geolocation.getCurrentPosition(pos => {
        const userLoc = [pos.coords.latitude, pos.coords.longitude];

        // User marker
        if (userMarker) map.removeLayer(userMarker);
        const userIcon = L.icon({ iconUrl:'/image/location.png', iconSize:[35,40], iconAnchor:[17,40] });
        userMarker = L.marker(userLoc, { icon: userIcon }).addTo(map).bindPopup("<strong>You are here</strong>").openPopup();

        // Find nearest listing
        const getDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371;
          const dLat = (lat2-lat1)*Math.PI/180;
          const dLon = (lon2-lon1)*Math.PI/180;
          const a = 0.5 - Math.cos(dLat)/2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*(1-Math.cos(dLon))/2;
          return R*2*Math.asin(Math.sqrt(a));
        };

        let nearest = null, minDist = Infinity;
        markers.forEach(h => {
          const [lat,lng] = h.coordinates;
          const dist = getDistance(userLoc[0],userLoc[1],lat,lng);
          if (dist<minDist) { minDist=dist; nearest=h; }
        });

        if (!nearest) return alert("No hotels nearby");

        // Highlight nearest
        L.circle(nearest.coordinates, { radius: 800, fillColor:"#FF385C", fillOpacity:0.25, weight:0 }).addTo(map);

        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline([userLoc, nearest.coordinates], { color:"#FF385C", weight:4, dashArray:"6,6" }).addTo(map);

        nearest.marker.openPopup();
        map.fitBounds([userLoc, nearest.coordinates], { padding: [50,50] });

      }, () => alert("Could not get your location"));
    });
  }
}
