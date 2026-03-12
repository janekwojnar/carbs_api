'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type MapItem = {
  id: string;
  slug: string;
  intention: string;
  locationLat: number;
  locationLng: number;
};

export function CandleMap({ items }: { items: MapItem[] }) {
  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-white/10">
      <MapContainer center={[52.1, 19.2]} zoom={6} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {items.map((item) => (
          <Marker key={item.id} position={[item.locationLat, item.locationLng]} icon={icon}>
            <Popup>
              <p>{item.intention}</p>
              <Link href={`/candle/${item.slug}`}>Open candle</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
