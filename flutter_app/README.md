# Territory Runner (Flutter Native)

Production-ready Flutter implementation for GPS territory capture running game.

## Architecture

```
Flutter
   │
   ├── google_maps_flutter
   │       ↓
   │    Google Maps
   │
   ├── geolocator
   │       ↓
   │    Phone GPS
   │
   └── Territory Engine
           ↓
      Polyline
           ↓
       Polygon
           ↓
      Area captured
```

## Structure
- `lib/main.dart` - App root entry point and dark high-contrast theme.
- `lib/models/gps_point.dart` - GPS point model.
- `lib/models/territory.dart` - Territory sector model.
- `lib/services/territory_engine.dart` - Haversine distance, loop detection, and geodesic spherical polygon area (Gauss-Bonnet).
- `lib/services/gps_service.dart` - Real-time Geolocator hardware GPS stream.
- `lib/screens/map_screen.dart` - Interactive Google Maps view with dynamic live polylines and polygon overlays.
- `android/app/src/main/AndroidManifest.xml` - Android location permissions and Maps metadata.
- `ios/Runner/Info.plist` - iOS GPS usage descriptions.

## Getting Started

1. Install Flutter dependencies:
```bash
cd flutter_app
flutter pub get
```

2. Add your Google Maps API Key in:
   - `android/app/src/main/AndroidManifest.xml`
   - `ios/Runner/AppDelegate.swift` or `Info.plist`

3. Run on connected Android/iOS device:
```bash
flutter run
```
