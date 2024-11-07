/* global google */
import React, { useEffect } from "react";

const RouteCalculator = ({
  map,
  userLocation,
  selectedLot,
  routesInfo,
  setRoutesInfo,
  activeRouteIndex,
  setActiveRouteIndex,
}) => {
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

            return {
              renderer: directionsRenderer,
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
    <button onClick={calculateRoute} disabled={!selectedLot}>
      Navigate
    </button>
  );
};

export default RouteCalculator;
