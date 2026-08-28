import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../models/gps_point.dart';

class GpsService {
  /// Request permissions and verify location services are enabled
  Future<bool> checkAndRequestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Get current single device location
  Future<GpsPoint?> getCurrentPosition() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.bestForNavigation,
      );
      return GpsPoint(
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        speed: pos.speed,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp,
      );
    } catch (_) {
      return null;
    }
  }

  /// Stream high-accuracy GPS positions tailored for outdoor running and tracking
  Stream<GpsPoint> startLocationStream({int distanceFilterMeters = 2}) {
    final locationSettings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: distanceFilterMeters, // Update emitted every 2 meters
    );

    return Geolocator.getPositionStream(locationSettings: locationSettings).map(
      (pos) => GpsPoint(
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        speed: pos.speed,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp,
      ),
    );
  }
}
