/* global google */

import React, { useEffect, useRef, useState, useCallback } from "react";
import parkingData from "./data/nearby_parking.json";
import { FaParking } from "react-icons/fa";
import ReactDOMServer from "react-dom/server";

const ParkingMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false); // 新增状态
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [infoWindows, setInfoWindows] = useState([]);

  // 动态加载 Google Maps API
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=visualization`;
    script.async = true;
    script.onload = () => setMapLoaded(true); // 当脚本加载完毕时更新状态
    document.head.appendChild(script);

    return () => {
      // 清理脚本
      document.head.removeChild(script);
    };
  }, []);

  // 创建热力图数据
  const getHeatmapData = useCallback(() => {
    return parkingData.map((spot) => ({
      location: new google.maps.LatLng(
        spot.coordinates.lat,
        spot.coordinates.lng
      ),
      weight: (1 - spot.currentAvaliability / spot.totalSpaces) * 5,
    }));
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || map || !mapLoaded) return; // 等待脚本加载完成

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

    // 添加交通图层
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(googleMap);

    setMap(googleMap);
  }, [mapRef, map, mapLoaded]);

  // 初始化热力图
  useEffect(() => {
    if (!map || !mapLoaded) return; // 等待脚本加载完成

    try {
      const heatmapData = getHeatmapData();
      const heatmapLayer = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 80, // 固定半径大小，可以根据需要调整
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

  // 创建标记点和信息窗口
  useEffect(() => {
    if (!map || markers.length > 0 || !mapLoaded) return; // 等待脚本加载完成

    const newMarkers = [];
    const newInfoWindows = [];

    const parkingIcon = {
      url: `${process.env.PUBLIC_URL}/parking.png`,
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 24),
    };

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
        icon: parkingIcon,
        map: map,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="width: 200px;">
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

    // custom marker
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

    stadiumMarker.addListener("click", () => {
      const stadiumInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="width: 200px;">
            <h3>Rogers Centre</h3>
          </div>
        `,
      });
      stadiumInfoWindow.open(map, stadiumMarker);
    });

  }, [map, mapLoaded]);

  return <div ref={mapRef} style={{ height: "100vh", width: "100%" }} />;
};

export default ParkingMap;
