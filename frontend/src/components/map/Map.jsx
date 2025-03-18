// components/map/Map.jsx
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
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

// Custom marker icon for waste bins
const createBinIcon = (fullness) => {
    // Choose color based on fullness
    let color = '#0d9488'; // teal for normal levels
    if (fullness > 80) {
        color = '#ef4444'; // red for high levels
    } else if (fullness > 60) {
        color = '#f59e0b'; // amber for medium levels
    }

    return L.divIcon({
        className: 'custom-bin-icon',
        html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
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

const Map = ({
                 center = [43.2364, 76.9457],
                 zoom = 13,
                 markers = [],
                 showRadius = false,
                 radiusInMeters = 500
             }) => {
    // Fix for leaflet marker images - moved inside the component
    useEffect(() => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
    }, []);

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

            {markers.map((marker) => (
                <Marker
                    key={marker.id}
                    position={marker.position}
                    icon={createBinIcon(marker.fullness || 0)}
                    eventHandlers={{
                        click: marker.onClick ? () => marker.onClick() : undefined
                    }}
                >
                    <Popup>
                        <div dangerouslySetInnerHTML={{ __html: marker.popup }} />
                    </Popup>
                </Marker>
            ))}

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
            onClick: PropTypes.func
        })
    ),
    showRadius: PropTypes.bool,
    radiusInMeters: PropTypes.number,
};

export default Map;