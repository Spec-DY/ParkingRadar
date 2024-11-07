/* global google */

import React, { useEffect, useRef, useState, useCallback } from "react";
import parkingData from "./data/nearby_parking.json";
import ReactDOMServer from "react-dom/server";
import './ParkingMap.css';
import { Popover } from "@mui/material";
import RouteCalculator from "./RouteCalculator";
import { FaParking, FaAccessibleIcon, FaDoorOpen, FaCheckCircle, FaClock } from "react-icons/fa";

import { Paper, Typography, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText } from "@mui/material"
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { ListItemIcon, Grow } from "@mui/material";
import { PiNumberSquareOneBold, PiNumberSquareTwoBold, PiNumberSquareThreeBold } from "react-icons/pi";

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
  const [stadiumInfoWindow, setStadiumInfoWindow] = useState(null);

  const userLocation = { lat: 43.8361, lng: -79.5083 };
  const stadiumInfoWindowRef = useRef(null);

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

  const getHeatmapData = useCallback(() => {
    return parkingData.map((spot) => ({
      location: new google.maps.LatLng(
        spot.coordinates.lat,
        spot.coordinates.lng
      ),
      weight: (1 - spot.currentAvaliability / spot.totalSpaces) * 5,
    }));
  }, []);

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
        position: { lat: spot.coordinates.lat, lng: spot.coordinates.lng },
        icon: parkingIcon,
        map: map,
      });
      marker.addListener("click", (event) => {
        setAnchorEl(event.domEvent.currentTarget);
        setSelectedSpot(spot);
        if (stadiumInfoWindow) stadiumInfoWindow.close();
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

    const newStadiumInfoWindow = new google.maps.InfoWindow({
      content: `<div style="width: 200px;"><h1>Rogers Centre</h1></div>`,
    });
    stadiumMarker.addListener("click", () => {
      if (stadiumInfoWindow) stadiumInfoWindow.close();
      newStadiumInfoWindow.open(map, stadiumMarker);
      setAnchorEl(null);
    });
    setStadiumInfoWindow(newStadiumInfoWindow);

    map.addListener("click", () => {
      if (stadiumInfoWindow) stadiumInfoWindow.close();
    });
  }, [map, mapLoaded]);

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedSpot(null);
  };

  return (
    <div style={{ display: "flex", backgroundColor: "#f0f0f0"}}>
      {/* Left Sidebar for Route Selection */}
      <div style={{ width: "250px", padding: "20px", overflowY: "auto" }}>
      <Paper elevation={3} style={{ padding: "10px" }}>
  {/* Header */}
  <Box mb={2}>
    <AppBar
      position="static"
      color="default"
      elevation={0}
      style={{
        padding: "30px",
        borderBottom: "10px solid #e0e0e0",
        backgroundColor: "#f8f9fa",
      }}
    >
<Toolbar style={{ justifyContent: "center", padding: 0 }}>
  <Typography variant="h5" align="center" style={{ fontFamily: 'Roboto, Arial, sans-serif' }}>
    Parking Lot Navigation
  </Typography>
</Toolbar>
    </AppBar>
  </Box>

    {/* Select Parking Lot */}
    <FormControl fullWidth style={{ marginBottom: "15px" }}>
      <InputLabel>Select Parking Lot</InputLabel>
      <Select
        value={selectedLot ? selectedLot.id : ""}
        onChange={(e) => {
          const lot = parkingData.find(
            (lot) => lot.id === parseInt(e.target.value)
          );
          setSelectedLot(lot);
        }}
        label="Select Parking Lot"
      >
        <MenuItem value="">
          <em>Choose a parking lot</em>
        </MenuItem>
        {parkingData.map((lot) => (
          <MenuItem key={lot.id} value={lot.id}>
            {lot.name} (Available: {lot.currentAvaliability})
          </MenuItem>
        ))}
      </Select>
    </FormControl>

    {/* Route Calculator */}
    <RouteCalculator
      map={map}
      userLocation={userLocation}
      selectedLot={selectedLot}
      routesInfo={routesInfo}
      setRoutesInfo={setRoutesInfo}
      activeRouteIndex={activeRouteIndex}
      setActiveRouteIndex={setActiveRouteIndex}
    />

    {/* Routes List */}
    <List>
  {routesInfo.map((route, index) => (
    <ListItem
      key={index}
      button
      onClick={() => setActiveRouteIndex(index)}
      selected={index === activeRouteIndex}
      style={{ display: "flex", alignItems: "center" }}
    >
      <div style={{ flex: '0 0 auto' }}>
      {/* Display corresponding icon based on index */}
      {index === 0 && <PiNumberSquareOneBold style={{ marginRight: 10, fontSize: "30px" }} />}
      {index === 1 && <PiNumberSquareTwoBold style={{ marginRight: 10, fontSize: "30px" }} />}
      {index === 2 && <PiNumberSquareThreeBold style={{ marginRight: 10, fontSize: "30px" }} />}
      </div>

      <ListItemText
        primary={`Route ${index + 1}: ${route.summary}`}
        secondary={`${route.duration} (${route.distance})`}
        style={{ color: index === activeRouteIndex ? "blue" : "black" }}
      />
    </ListItem>
  ))}
</List>
  </Paper>
</div>


      {/* Map Area */}
      <div ref={mapRef} style={{ height: "100vh", width: "calc(100% - 250px)" }} />

      {/* Popover Component */}
      {/* Popover Component */}
<Popover
  open={Boolean(anchorEl)}
  anchorEl={anchorEl}
  onClose={handleClose}
  anchorOrigin={{ vertical: "top", horizontal: "center" }}
  transformOrigin={{ vertical: "bottom", horizontal: "center" }}
>
  <div style={{ padding: 16, width: 250 }}>
    {selectedSpot && (
      <>
        <h3 style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold" }}>{selectedSpot.name}</h3>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <FaParking style={{ marginRight: 8, fontSize: "18px" }} />
          <p style={{ margin: 0, wordWrap: "break-word", textAlign: "left", fontSize: "16px" }}>
            Total Spaces: {selectedSpot.totalSpaces}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <FaAccessibleIcon style={{ marginRight: 8, fontSize: "18px" }} />
          <p style={{ margin: 0, wordWrap: "break-word", textAlign: "left", fontSize: "16px" }}>
            Handicap Spaces: {selectedSpot.handicapSpaces}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <FaDoorOpen style={{ marginRight: 8, fontSize: "18px" }} />
          <p style={{ margin: 0, wordWrap: "break-word", textAlign: "left", fontSize: "16px" }}>
            Access: {selectedSpot.access}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <FaCheckCircle style={{ marginRight: 8, fontSize: "18px" }} />
          <p style={{ margin: 0, wordWrap: "break-word", textAlign: "left", fontSize: "16px" }}>
            Available Now: {selectedSpot.currentAvaliability}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <FaClock style={{ marginRight: 8, fontSize: "18px" }} />
          <p style={{ margin: 0, wordWrap: "break-word", textAlign: "left", fontSize: "16px" }}>
            Avaliability after 1 hour: {selectedSpot.AvaliabilityAfterOneHour}
          </p>
        </div>
      </>
    )}
  </div>
</Popover>
    </div>
  );
};

export default ParkingMap;
