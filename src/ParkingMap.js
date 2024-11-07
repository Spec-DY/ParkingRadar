/* global google */

import React, { useEffect, useRef, useState, useCallback } from "react";
import parkingData from "./data/nearby_parking.json";
import { FaParking } from "react-icons/fa";
import ReactDOMServer from "react-dom/server";
import './ParkingMap.css';
import Popover from "@mui/material/Popover";

const ParkingMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null); // Popover anchor element
  const [selectedSpot, setSelectedSpot] = useState(null); // Store selected parking spot info
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
    script.onload = () => setMapLoaded(true); // 更新脚本加载状态
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
    if (!map || !mapLoaded) return;

    try {
      const heatmapData = getHeatmapData();
      const heatmapLayer = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 80,
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
        setAnchorEl(event.domEvent.currentTarget); // 设置 Popover 锚点
        setSelectedSpot(spot); // 设置当前停车位信息
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    const stadiumIcon = {
      url: `${process.env.PUBLIC_URL}/stadium.png`,
      scaledSize: new google.maps.Size(60, 60),
      anchor: new google.maps.Point(30, 60),
    };

    const stadiumMarker = new google.maps.Marker({
      position: { lat: 43.641796, lng: -79.390083 },
      icon: stadiumIcon,
      map: map,
    });
    const stadiumInfoWindow = new google.maps.InfoWindow({
      content: `<div style="width: 200px;"><h1>Rogers Centre</h1></div>`,
    });

    stadiumMarker.addListener("click", () => {
      stadiumInfoWindow.open(map, stadiumMarker); // 仅使用 InfoWindow 显示
    });

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
  // 关闭 Popover 的函数
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedSpot(null);
  };

  return (
    <div>
      <div ref={mapRef} style={{ height: "100vh", width: "100%" }} />

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
