"use client"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import L from "leaflet"
import "leaflet-draw"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import { useEffect, useRef } from "react"
import { MAP_FILTER_MAP_MIN_HEIGHT_PX, MAP_FILTER_DEFAULT_CENTER } from "./property-map-filter-constants"

// Self-contained SVG pin icon — avoids bundler issues with default Leaflet PNG paths
const PIN_ICON = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path fill="#3b82f6" stroke="#fff" stroke-width="1.5"
      d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0zm0 19a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
  </svg>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function MapViewUpdater({ flyTo }: { flyTo: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (!flyTo) return
    map.setView(flyTo, 16)
    const id = requestAnimationFrame(() => {
      map.invalidateSize()
    })
    return () => cancelAnimationFrame(id)
  }, [flyTo, map])
  return null
}

function MapInvalidateWhenDialogOpens({ dialogOpen }: { dialogOpen: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) map.invalidateSize()
      })
    })
    const t = window.setTimeout(() => {
      if (!cancelled) map.invalidateSize()
    }, 250)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      window.clearTimeout(t)
    }
  }, [dialogOpen, map])
  return null
}

function MapResizeObserver() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

function DrawControl({
  onPolygonComplete,
  onPolygonDeleted,
  initialPolygon,
}: {
  onPolygonComplete: (points: [number, number][]) => void
  onPolygonDeleted: () => void
  initialPolygon?: [number, number][]
}) {
  const map = useMap()
  const completeRef = useRef(onPolygonComplete)
  const deletedRef = useRef(onPolygonDeleted)
  // Capture at mount time only — not updated on re-renders
  const initialPolygonRef = useRef(initialPolygon)

  useEffect(() => {
    completeRef.current = onPolygonComplete
  })
  useEffect(() => {
    deletedRef.current = onPolygonDeleted
  })

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const pts = initialPolygonRef.current
    if (pts && pts.length >= 3) {
      drawnItems.addLayer(L.polygon(pts.map(([lat, lng]) => L.latLng(lat, lng))))
    }

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: false },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup: drawnItems },
    })
    map.addControl(drawControl)

    function extractPoints(layer: L.Layer): [number, number][] {
      const latlngs = (layer as L.Polygon).getLatLngs()
      const ring = Array.isArray(latlngs[0]) ? (latlngs[0] as L.LatLng[]) : (latlngs as L.LatLng[])
      return ring.map((ll) => [ll.lat, ll.lng])
    }

    function onCreated(e: L.DrawEvents.Created) {
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      completeRef.current(extractPoints(e.layer))
    }

    function onEdited(_e: L.DrawEvents.Edited) {
      // Re-apply with current polygon positions (e.layers is empty when no vertices moved)
      drawnItems.eachLayer((layer) => {
        completeRef.current(extractPoints(layer))
      })
    }

    function onDeleted() {
      deletedRef.current()
    }

    map.on(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn)
    map.on(L.Draw.Event.EDITED, onEdited as L.LeafletEventHandlerFn)
    map.on(L.Draw.Event.DELETED, onDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn)
      map.off(L.Draw.Event.EDITED, onEdited as L.LeafletEventHandlerFn)
      map.off(L.Draw.Event.DELETED, onDeleted)
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map])

  return null
}

export interface PropertyMapFilterMapProps {
  dialogOpen: boolean
  flyTo: [number, number] | null
  pinAt?: [number, number] | null
  pinLabel?: string
  onPolygonComplete: (points: [number, number][]) => void
  onPolygonDeleted: () => void
  initialPolygon?: [number, number][]
}

export default function PropertyMapFilterMap({
  dialogOpen,
  flyTo,
  pinAt,
  pinLabel,
  onPolygonComplete,
  onPolygonDeleted,
  initialPolygon,
}: PropertyMapFilterMapProps) {
  return (
    <MapContainer
      center={MAP_FILTER_DEFAULT_CENTER}
      zoom={16}
      aria-label="Map: draw a polygon to filter nearby streets"
      className="h-full w-full rounded-md [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:rounded-md"
      style={{ minHeight: MAP_FILTER_MAP_MIN_HEIGHT_PX }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeObserver />
      <MapInvalidateWhenDialogOpens dialogOpen={dialogOpen} />
      <MapViewUpdater flyTo={flyTo} />
      {pinAt && (
        <Marker position={pinAt} icon={PIN_ICON}>
          {pinLabel && (
            <Popup>
              <span className="text-xs font-medium">Target Point Location:</span>
              <br />
              {pinLabel}
            </Popup>
          )}
        </Marker>
      )}
      <DrawControl onPolygonComplete={onPolygonComplete} onPolygonDeleted={onPolygonDeleted} initialPolygon={initialPolygon} />
    </MapContainer>
  )
}
