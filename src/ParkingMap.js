/* global google */

import React, { useEffect, useRef, useState, useCallback } from "react";
import parkingData from "./data/nearby_parking.json";
import { FaParking } from "react-icons/fa";
import ReactDOMServer from "react-dom/server";

const ParkingMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [infoWindows, setInfoWindows] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [routesInfo, setRoutesInfo] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0); // Default to first route
  const [showControls, setShowControls] = useState(false); // Control visibility of controls

  const userLocation = { lat: 43.8361, lng: -79.5083 }; // Hardcoded user location

  // Dynamic Google Maps API loading
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=visualization&language=en`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Function to create heatmap data
  const getHeatmapData = useCallback(() => {
    return parkingData.map((spot) => ({
      location: new google.maps.LatLng(
        spot.coordinates.lat,
        spot.coordinates.lng
      ),
      weight: (1 - spot.currentAvaliability / spot.totalSpaces) * 5,
    }));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map || !mapLoaded) return;

    const googleMap = new google.maps.Map(mapRef.current, {
      center: { lat: 43.7, lng: -79.4 },
      zoom: 12,
      styles: [
        {
          featureType: "poi.business",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(googleMap);

    setMap(googleMap);

    // User location marker
    new google.maps.Marker({
      position: userLocation,
      map: googleMap,
      title: "Your Location (Richmond Hill)",
    });
  }, [mapRef, map, mapLoaded]);

  // Initialize heatmap
  useEffect(() => {
    if (!map || !mapLoaded) return;

    try {
      const heatmapData = getHeatmapData();
      const heatmapLayer = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 80,
        opacity: 0.6,
        gradient: [
          "rgba(0, 0, 255, 0)",
          "rgba(0, 0, 255, 1)",
          "rgba(0, 255, 0, 1)",
          "rgba(255, 255, 0, 1)",
          "rgba(255, 0, 0, 1)",
        ],
      });

      setHeatmap(heatmapLayer);

      return () => {
        if (heatmapLayer) {
          heatmapLayer.setMap(null);
        }
      };
    } catch (error) {
      console.error("Error creating heatmap:", error);
    }
  }, [map, mapLoaded, getHeatmapData]);

  // Create markers and info windows
  useEffect(() => {
    if (!map || markers.length > 0 || !mapLoaded) return;

    const newMarkers = [];
    const newInfoWindows = [];

    parkingData.forEach((spot) => {
      const icon = {
        url: `data:image/svg+xml,${encodeURIComponent(
          ReactDOMServer.renderToString(
            <FaParking style={{ fontSize: "24px", color: "black" }} />
          )
        )}`,
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 24),
      };

      const marker = new google.maps.Marker({
        position: {
          lat: spot.coordinates.lat,
          lng: spot.coordinates.lng,
        },
        icon: icon,
        map: map,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <h3>${spot.name}</h3>
            <p>Total Spaces: ${spot.totalSpaces}</p>
            <p>Handicap Spaces: ${spot.handicapSpaces}</p>
            <p>Access: ${spot.access}</p>
            <p>Available Now: ${spot.currentAvaliability}</p>
            <p>Prediction in 1 Hour: ${spot.AvaliabilityAfterOneHour}</p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        newInfoWindows.forEach((iw) => iw.close());
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
      newInfoWindows.push(infoWindow);
    });

    setMarkers(newMarkers);
    setInfoWindows(newInfoWindows);

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
      newInfoWindows.forEach((infoWindow) => infoWindow.close());
    };
  }, [map, mapLoaded]);

  // Default selection for most available parking lot
  useEffect(() => {
    const mostAvailableLot = parkingData.reduce((prev, current) =>
      prev.currentAvaliability > current.currentAvaliability ? prev : current
    );
    setSelectedLot(mostAvailableLot);
  }, []);

  // Calculate and display routes
  const calculateRoute = () => {
    if (!userLocation || !map || !selectedLot) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: userLocation,
        destination: {
          lat: selectedLot.coordinates.lat,
          lng: selectedLot.coordinates.lng,
        },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          routesInfo.forEach((route) => route.renderer.setMap(null));

          const routeDetails = result.routes.map((route, index) => {
            const directionsRenderer = new google.maps.DirectionsRenderer({
              map: map,
              routeIndex: index,
              directions: result,
              polylineOptions: {
                strokeColor: index === activeRouteIndex ? "#1959F9" : "#BDCFF9",
                strokeWeight: 8,
                zIndex: index === activeRouteIndex ? 1 : 0,
              },
              suppressMarkers: false,
              preserveViewport: true,
            });

            const routeInfoWindow = new google.maps.InfoWindow({
              content: `<strong>Route ${index + 1}</strong>: ${
                route.legs[0].duration.text
              } (${route.legs[0].distance.text})`,
              position: route.legs[0].end_location,
            });

            if (index === activeRouteIndex) {
              routeInfoWindow.open(map);
            }

            google.maps.event.addListener(directionsRenderer, "click", () => {
              setActiveRouteIndex(index);
              setRoutesInfo((prevRoutes) => {
                prevRoutes.forEach((r, i) => {
                  if (i === index) {
                    r.infoWindow.open(map);
                  } else {
                    r.infoWindow.close();
                  }
                });
                return prevRoutes;
              });
            });

            return {
              renderer: directionsRenderer,
              infoWindow: routeInfoWindow,
              summary: route.summary,
              duration: route.legs[0].duration.text,
              distance: route.legs[0].distance.text,
            };
          });

          setRoutesInfo(routeDetails);
        } else {
          console.error("Error fetching directions", result);
        }
      }
    );
  };

  return (
    <div>
      <div ref={mapRef} style={{ height: "95vh", width: "100%" }} />
      <button
        onClick={() => setShowControls((prev) => !prev)}
        style={{ margin: "10px", padding: "5px 10px" }}
      >
        {showControls ? "Hide Demo" : "Show Demo"}
      </button>

      {showControls && (
        <div style={{ padding: "10px" }}>
          <label>Select Parking Lot: </label>
          <select
            value={selectedLot ? selectedLot.id : ""}
            onChange={(e) => {
              const lot = parkingData.find(
                (lot) => lot.id === parseInt(e.target.value)
              );
              setSelectedLot(lot);
            }}
          >
            <option value="">Choose a parking lot</option>
            {parkingData.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.name} (Available: {lot.currentAvaliability})
              </option>
            ))}
          </select>
          <button onClick={calculateRoute} disabled={!selectedLot}>
            Navigate
          </button>

          <div style={{ padding: "10px" }}>
            <ul>
              {routesInfo.map((route, index) => (
                <li
                  key={index}
                  onClick={() => setActiveRouteIndex(index)}
                  style={{
                    cursor: "pointer",
                    fontWeight: index === activeRouteIndex ? "bold" : "normal",
                    color: index === activeRouteIndex ? "blue" : "black",
                  }}
                >
                  <strong>Route {index + 1}</strong>: {route.summary} -{" "}
                  {route.duration} ({route.distance})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingMap;
