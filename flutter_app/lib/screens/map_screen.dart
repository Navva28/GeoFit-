import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/gps_point.dart';
import '../models/territory.dart';
import '../services/gps_service.dart';
import '../services/territory_engine.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final GpsService _gpsService = GpsService();
  GoogleMapController? _mapController;

  StreamSubscription<GpsPoint>? _gpsSubscription;
  final List<GpsPoint> _routePoints = [];
  final List<Territory> _capturedTerritories = [];

  bool _isTracking = false;
  bool _isLoopClosedCandidate = false;
  double _totalDistanceMeters = 0.0;
  GpsPoint? _currentLocation;

  // Polyline, Polygon and Marker state sets for Google Maps Flutter
  final Set<Polyline> _polylines = {};
  final Set<Polygon> _polygons = {};
  final Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _initGps();
  }

  Future<void> _initGps() async {
    final hasPermission = await _gpsService.checkAndRequestPermission();
    if (hasPermission) {
      final initialPos = await _gpsService.getCurrentPosition();
      if (initialPos != null && mounted) {
        setState(() {
          _currentLocation = initialPos;
        });
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(initialPos.toLatLng(), 16.5),
        );
      }

      _gpsSubscription = _gpsService.startLocationStream().listen(_onLocationUpdate);
    }
  }

  void _onLocationUpdate(GpsPoint point) {
    if (!mounted) return;

    setState(() {
      _currentLocation = point;

      if (_isTracking) {
        if (_routePoints.isNotEmpty) {
          final lastPoint = _routePoints.last.toLatLng();
          final stepDistance = TerritoryEngine.calculateDistance(lastPoint, point.toLatLng());

          // Filter GPS jitter (< 1.5 meters)
          if (stepDistance > 1.5) {
            _totalDistanceMeters += stepDistance;
            _routePoints.add(point);
          }
        } else {
          _routePoints.add(point);
        }

        // Loop closure detection
        _isLoopClosedCandidate = TerritoryEngine.checkLoopClosure(
          route: _routePoints,
          totalDistanceCovered: _totalDistanceMeters,
        );

        _updateMapOverlays();
      }
    });

    if (_isTracking && _mapController != null) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLng(point.toLatLng()),
      );
    }
  }

  void _updateMapOverlays() {
    final List<LatLng> latLngRoute = _routePoints.map((p) => p.toLatLng()).toList();

    // 1. Live Running Polyline
    _polylines.clear();
    if (latLngRoute.length >= 2) {
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('live_run_track'),
          points: latLngRoute,
          color: const Color(0xFFFF5F1F),
          width: 5,
        ),
      );
    }

    // 2. Start Marker & Origin Pin
    _markers.clear();
    if (_routePoints.isNotEmpty) {
      _markers.add(
        Marker(
          markerId: const MarkerId('start_origin_point'),
          position: _routePoints.first.toLatLng(),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.HUE_ORANGE),
          infoWindow: const InfoWindow(title: 'Territory Origin Point'),
        ),
      );
    }

    // 3. Render Captured Territory Polygons
    _polygons.clear();
    for (final territory in _capturedTerritories) {
      _polygons.add(
        Polygon(
          polygonId: PolygonId(territory.id),
          points: territory.points,
          fillColor: Color(territory.colorHex).withOpacity(0.35),
          strokeColor: Color(territory.colorHex),
          strokeWidth: 3,
        ),
      );
    }
  }

  void _toggleRun() {
    setState(() {
      if (_isTracking) {
        _isTracking = false;
      } else {
        _isTracking = true;
        _routePoints.clear();
        _totalDistanceMeters = 0.0;
        _isLoopClosedCandidate = false;
      }
    });
  }

  void _claimTerritory() {
    if (_routePoints.length < 3) return;

    final closedPoints = _routePoints.map((p) => p.toLatLng()).toList();
    // Complete loop to start position
    closedPoints.add(_routePoints.first.toLatLng());

    final areaSqM = TerritoryEngine.calculatePolygonArea(closedPoints);

    final newTerritory = Territory(
      id: 'territory_${DateTime.now().millisecondsSinceEpoch}',
      name: 'Sector #${_capturedTerritories.length + 1}',
      points: closedPoints,
      areaSqMeters: areaSqM,
      perimeterMeters: _totalDistanceMeters,
      capturedAt: DateTime.now(),
      colorHex: 0xFFFF5F1F,
    );

    setState(() {
      _capturedTerritories.add(newTerritory);
      _isTracking = false;
      _routePoints.clear();
      _totalDistanceMeters = 0;
      _isLoopClosedCandidate = false;
      _updateMapOverlays();
    });

    _showVictoryModal(newTerritory);
  }

  void _showVictoryModal(Territory territory) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF121212),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shield_outlined, color: Color(0xFFFF5F1F), size: 48),
            const SizedBox(height: 12),
            const Text(
              'TERRITORY CAPTURED!',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              'Area: ${TerritoryEngine.formatArea(territory.areaSqMeters)} (${territory.areaAcres.toStringAsFixed(2)} Acres)',
              style: const TextStyle(color: Color(0xFFFF5F1F), fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF5F1F),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('CONTINUE RUNNING', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _gpsSubscription?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Google Map
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _currentLocation?.toLatLng() ?? const LatLng(37.7749, -122.4194),
              zoom: 16.5,
            ),
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            polylines: _polylines,
            polygons: _polygons,
            markers: _markers,
            onMapCreated: (controller) => _mapController = controller,
          ),

          // Running Metrics HUD
          Positioned(
            top: 50,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F0F0F).withOpacity(0.92),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF262626)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('DISTANCE', style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold)),
                      Text('${(_totalDistanceMeters / 1000).toStringAsFixed(2)} km', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('TERRITORIES', style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold)),
                      Text('${_capturedTerritories.length} Sectors', style: const TextStyle(color: Color(0xFFFF5F1F), fontSize: 18, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Territory Loop Claim Action Button
          if (_isLoopClosedCandidate)
            Positioned(
              bottom: 120,
              left: 20,
              right: 20,
              child: ElevatedButton.icon(
                onPressed: _claimTerritory,
                icon: const Icon(Icons.check_circle, color: Colors.white),
                label: const Text('CLAIM CLOSED TERRITORY NOW', style: TextStyle(fontWeight: FontWeight.w900)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF5F1F),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                ),
              ),
            ),

          // Primary Run Toggle Button
          Positioned(
            bottom: 40,
            left: 24,
            right: 24,
            child: ElevatedButton(
              onPressed: _toggleRun,
              style: ElevatedButton.styleFrom(
                backgroundColor: _isTracking ? const Color(0xFFEF4444) : const Color(0xFFFF5F1F),
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              child: Text(
                _isTracking ? 'STOP RUN' : 'START RUNNING & CAPTURE',
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
