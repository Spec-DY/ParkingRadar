import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import parkingData from './data/nearby_parking.json'; 
import { FaParking } from "react-icons/fa";
import ReactDOMServer from 'react-dom/server';

const createParkingIcon = () => {
  return L.divIcon({
    html: ReactDOMServer.renderToString(<FaParking style={{ fontSize: "24px", color: "black" }} />),
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};


const HeatmapLayer = ({ data, radius }) => {
  const map = useMap();

  useEffect(() => {

    const heatLayer = L.heatLayer(
      data.map(spot => {
        const occupancyRate = 1 - (spot.availableSpots / spot.totalSpaces);
        return [
          spot.coordinates.lat, 
          spot.coordinates.lng, 
          occupancyRate * 5 // 强度
        ];
      }),
      {
        radius: radius,
        blur: 15,
        maxZoom: 17,
        maxOpacity: 0.6,
        gradient: { 0.2: 'blue', 0.5: 'lime', 0.8: 'yellow', 1.0: 'red' }
      }
    ).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, map, radius]);

  return null;
};

// 自定义组件，用于实时监听地图的缩放级别
const ZoomLevelWatcher = ({ setZoomLevel }) => {
  const map = useMap();

  useEffect(() => {
    const onZoomEnd = () => {
      const currentZoom = map.getZoom();
      setZoomLevel(currentZoom);
      console.log("Current zoom level:", currentZoom);
    };
    
    map.on('zoomend', onZoomEnd);

    return () => {
      map.off('zoomend', onZoomEnd);
    };
  }, [map, setZoomLevel]);

  return null;
};

const ParkingMap = () => {
  const [parkingSpots, setParkingSpots] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [radius, setRadius] = useState(20);

  useEffect(() => {
    const spotsWithAvailability = parkingData.map(spot => ({
      ...spot,
      availableSpots: spot.currentAvaliability
    }));
    setParkingSpots(spotsWithAvailability);
  }, []);

  // 动态更新热力图的半径
  useEffect(() => {
    const newRadius = Math.max(10, 80 * (zoomLevel / 12));
    setRadius(newRadius);
  }, [zoomLevel]);

  return (
    <MapContainer 
      center={[43.7, -79.4]} 
      zoom={12} 
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* 监听缩放级别变化 */}
      <ZoomLevelWatcher setZoomLevel={setZoomLevel} />

      <HeatmapLayer data={parkingSpots} radius={radius} />

      {parkingSpots.map(spot => (
        zoomLevel >= 14 && (
          <Marker key={spot.id} position={[spot.coordinates.lat, spot.coordinates.lng]} icon={createParkingIcon()}>
            <Popup>
              <div>
                <h3>{spot.name}</h3>
                <p>Total Spaces: {spot.totalSpaces}</p>
                <p>Handicap Spaces: {spot.handicapSpaces}</p>
                <p>Access: {spot.access}</p>
                <p>Available Now: {spot.currentAvaliability}</p>
                <p>Prediction in 1 Hour: {spot.AvaliabilityAfterOneHour}</p>
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default ParkingMap;
