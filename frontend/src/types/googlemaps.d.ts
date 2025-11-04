// Google Maps API type declarations
declare namespace google {
  namespace maps {
    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain',
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      extend(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
    }

    interface MapOptions {
      zoom?: number;
      center?: LatLng | LatLngLiteral;
      mapTypeId?: MapTypeId | string;
      streetViewControl?: boolean;
      mapTypeControl?: boolean;
      fullscreenControl?: boolean;
    }

    class Map {
      constructor(element: HTMLElement | null, options?: MapOptions);
      setCenter(center: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds): void;
    }

    interface PolylineOptions {
      path?: (LatLng | LatLngLiteral)[];
      geodesic?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    class Polyline {
      constructor(options?: PolylineOptions);
      setMap(map: Map | null): void;
      setPath(path: (LatLng | LatLngLiteral)[]): void;
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map | null;
      title?: string;
    }

    class Marker {
      constructor(options?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(position: LatLng | LatLngLiteral): void;
    }
  }
}

