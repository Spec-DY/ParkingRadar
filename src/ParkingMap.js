/* global google */

import React, { useEffect, useRef, useState, useCallback } from "react";
import parkingData from "./data/nearby_parking.json";
import { FaParking } from "react-icons/fa";
import ReactDOMServer from "react-dom/server";
import './ParkingMap.css';
import { Popover } from "@mui/material";
import RouteCalculator from "./RouteCalculator";

const ParkingMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [routesInfo, setRoutesInfo] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const userLocation = { lat: 43.8361, lng: -79.5083 };

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

    googleMap.setOptions({ clickableIcons: false });

    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(googleMap);

    setMap(googleMap);
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

    const parkingIcon = {
      url: `${process.env.PUBLIC_URL}/parking.png`,
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 24),
    };

    parkingData.forEach((spot) => {
      const marker = new google.maps.Marker({
        position: {
          lat: spot.coordinates.lat,
          lng: spot.coordinates.lng,
        },
        icon: parkingIcon,
        map: map,
      });

      marker.addListener("click", (event) => {
        setAnchorEl(event.domEvent.currentTarget);
        setSelectedSpot(spot);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, mapLoaded]);

  // Close Popover
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedSpot(null);
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

          <RouteCalculator
            map={map}
            userLocation={userLocation}
            selectedLot={selectedLot}
            routesInfo={routesInfo}
            setRoutesInfo={setRoutesInfo}
            activeRouteIndex={activeRouteIndex}
            setActiveRouteIndex={setActiveRouteIndex}
          />

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

      {/* Popover 组件 */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <div style={{ padding: 16 }}>
          {selectedSpot && (
            <>
              <h3>{selectedSpot.name}</h3>
              <p>Total Spaces: {selectedSpot.totalSpaces}</p>
              <p>Handicap Spaces: {selectedSpot.handicapSpaces}</p>
              <p>Access: {selectedSpot.access}</p>
              <p>Available Now: {selectedSpot.currentAvaliability}</p>
              <p>Prediction in 1 Hour: {selectedSpot.AvaliabilityAfterOneHour}</p>
            </>
          )}
        </div>
      </Popover>
    </div>
  );
};

export default ParkingMap;
