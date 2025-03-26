// components/map/Map.jsx - With properly scoped hooks
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Component to update map view when center changes
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    map.setView(center, zoom);
    return null;
};

ChangeView.propTypes = {
    center: PropTypes.array.isRequired,
    zoom: PropTypes.number.isRequired,
};

// Custom marker icon for bins
const createBinIcon = (fullness, isSelected = false) => {
    // Choose color based on fullness
    let color = '#0d9488'; // teal for normal levels
    if (fullness > 80) {
        color = '#ef4444'; // red for high levels
    } else if (fullness > 60) {
        color = '#f59e0b'; // amber for medium levels
    }

    // Add border for selected markers
    const borderColor = isSelected ? '#3b82f6' : 'white';
    const borderWidth = isSelected ? 3 : 2;

    return L.divIcon({
        className: 'custom-bin-icon',
        html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${borderColor};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="white">
          <path d="M3 6h18v2H3V6m2.5 0a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h13a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-13zM5 10h14l-1 14H6l-1-14zm7 11c.8 0 1.5-.7 1.5-1.5v-9c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v9c0 .8.7 1.5 1.5 1.5zm3.5-1.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-9c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v9zM5.5 8.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-9c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v9z"/>
        </svg>
      </div>
    `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
};

// Icon for tracking devices
const createDeviceIcon = (isSelected = false, isCollecting = false) => {
    // Use different colors based on status
    const color = isCollecting ? '#059669' : (isSelected ? '#3b82f6' : '#0d9488');
    const size = isSelected ? 30 : 24;

    return L.divIcon({
        className: 'device-icon',
        html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size*0.6}" height="${size*0.6}" fill="white">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
        </svg>
      </div>
    `,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -size/2],
    });
};

// Icon for checkpoints
const createCheckpointIcon = (checkpointType = 'waste_collection') => {
    // Different colors for different checkpoint types
    const colorMap = {
        'waste_collection': '#059669', // emerald-600
        'maintenance': '#f59e0b',      // amber-500
        'other': '#6366f1'             // indigo-500
    };

    const color = colorMap[checkpointType] || colorMap.other;
    const size = 22;

    return L.divIcon({
        className: 'checkpoint-icon',
        html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 4px;
        transform: rotate(45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size*0.6}" height="${size*0.6}" fill="white">
            <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/>
          </svg>
        </div>
      </div>
    `,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -size/2],
    });
};

const Map = ({
                 center = [43.2364, 76.9457],
                 zoom = 13,
                 markers = [],
                 showRadius = false,
                 radiusInMeters = 500,
                 historyPath = null
             }) => {
    // Fix for leaflet marker images - moved inside the component
    useEffect(() => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
        >
            <ChangeView center={center} zoom={zoom} />

            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Display markers */}
            {markers.map((marker) => {
                // Determine which icon to use based on marker type
                let icon;
                if (marker.type === 'checkpoint' || marker.isCheckpoint) {
                    icon = createCheckpointIcon(marker.checkpointType);
                } else if (marker.binId) {
                    icon = createBinIcon(marker.fullness || 0, marker.isSelected);
                } else {
                    icon = createDeviceIcon(marker.isSelected, marker.isCollecting);
                }

                return (
                    <Marker
                        key={marker.id}
                        position={marker.position}
                        icon={icon}
                    >
                        <Popup>
                            <div dangerouslySetInnerHTML={{ __html: marker.popup }} />
                        </Popup>
                    </Marker>
                );
            })}

            {/* Display history path if available */}
            {historyPath && historyPath.length > 0 && (
                <Polyline
                    positions={historyPath}
                    pathOptions={{
                        color: '#3b82f6',
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '10, 10',
                        dashOffset: '0'
                    }}
                />
            )}

            {/* Show radius circle if enabled */}
            {showRadius && (
                <Circle
                    center={center}
                    radius={radiusInMeters}
                    pathOptions={{
                        color: '#0d9488',
                        fillColor: '#0d9488',
                        fillOpacity: 0.1,
                    }}
                />
            )}
        </MapContainer>
    );
};

Map.propTypes = {
    center: PropTypes.array,
    zoom: PropTypes.number,
    markers: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            position: PropTypes.array.isRequired,
            popup: PropTypes.string,
            fullness: PropTypes.number,
            isSelected: PropTypes.bool,
            isCheckpoint: PropTypes.bool,
            type: PropTypes.string,
            checkpointType: PropTypes.string,
            binId: PropTypes.string,
            isCollecting: PropTypes.bool
        })
    ),
    showRadius: PropTypes.bool,
    radiusInMeters: PropTypes.number,
    historyPath: PropTypes.array
};

export default Map;