import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icon issue with bundlers
const createCustomIcon = (status) => {
  let color = '#3B82F6'; // ASSIGNED - Blue
  if (status === 'IN_PROGRESS') color = '#F59E0B'; // Orange
  if (status === 'COMPLETED') color = '#10B981'; // Green

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Component to dynamically fit map bounds to markers
function MapBoundsUpdater({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (markers && markers.length > 0) {
      const validMarkers = markers.filter((m) => m.latitude && m.longitude);
      if (validMarkers.length > 0) {
        const bounds = L.latLngBounds(validMarkers.map((m) => [m.latitude, m.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [markers, map]);

  return null;
}

export default function MapView({ tasks = [], onSelectTask, height = '400px' }) {
  // Filter tasks with valid GPS coordinates
  const mappedTasks = tasks.filter(
    (t) => t.latitude != null && t.longitude != null && !isNaN(t.latitude) && !isNaN(t.longitude)
  );

  // Default center: Turkey / Istanbul or first task
  const defaultCenter =
    mappedTasks.length > 0
      ? [mappedTasks[0].latitude, mappedTasks[0].longitude]
      : [41.0082, 28.9784];

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-800 relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={mappedTasks.length > 0 ? 11 : 6}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater markers={mappedTasks} />

        {mappedTasks.map((task) => (
          <Marker
            key={task.taskID}
            position={[task.latitude, task.longitude]}
            icon={createCustomIcon(task.status)}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[180px]">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Görev #{task.taskID}
                </div>
                <h4 className="font-bold text-slate-800 text-xs line-clamp-2">{task.title}</h4>
                <div className="text-[11px] text-slate-600 mt-1">
                  👤 {task.userName} {task.userSurname}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
                {onSelectTask && (
                  <button
                    onClick={() => onSelectTask(task)}
                    className="mt-2 w-full py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Detayları Gör
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
