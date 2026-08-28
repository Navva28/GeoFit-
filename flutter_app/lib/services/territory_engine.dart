import 'dart:math' as math;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/gps_point.dart';

class TerritoryEngine {
  static const double earthRadiusMeters = 6378137.0; // WGS-84 equatorial radius
  static const double defaultClosingThreshold = 25.0; // Meters to trigger loop close candidate

  /// Calculate distance between two GPS coordinates using the Haversine formula
  static double calculateDistance(LatLng p1, LatLng p2) {
    final dLat = _toRadians(p2.latitude - p1.latitude);
    final dLon = _toRadians(p2.longitude - p1.longitude);

    final lat1 = _toRadians(p1.latitude);
    final lat2 = _toRadians(p2.latitude);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1) * math.cos(lat2) * math.sin(dLon / 2) * math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));

    return earthRadiusMeters * c;
  }

  /// Calculate bearing (direction angle in degrees 0-360) from p1 to p2
  static double calculateBearing(LatLng p1, LatLng p2) {
    final lat1 = _toRadians(p1.latitude);
    final lat2 = _toRadians(p2.latitude);
    final dLon = _toRadians(p2.longitude - p1.longitude);

    final y = math.sin(dLon) * math.cos(lat2);
    final x = math.cos(lat1) * math.sin(lat2) -
        math.sin(lat1) * math.cos(lat2) * math.cos(dLon);

    final initialBearing = math.atan2(y, x);
    return (_toDegrees(initialBearing) + 360.0) % 360.0;
  }

  /// Check if the runner has completed a closed loop back to their start point
  static bool checkLoopClosure({
    required List<GpsPoint> route,
    required double totalDistanceCovered,
    double minTrackLength = 60.0, // Minimum distance covered before loop detection unlocks
    double thresholdMeters = defaultClosingThreshold,
  }) {
    if (route.length < 8 || totalDistanceCovered < minTrackLength) {
      return false;
    }

    final start = route.first.toLatLng();
    final current = route.last.toLatLng();
    final distanceToOrigin = calculateDistance(current, start);

    return distanceToOrigin <= thresholdMeters;
  }

  /// Calculates geodesic spherical polygon area in square meters using Gauss-Bonnet theorem
  static double calculatePolygonArea(List<LatLng> polygon) {
    if (polygon.length < 3) return 0.0;

    double total = 0.0;
    final int length = polygon.length;

    for (int i = 0; i < length; i++) {
      final p1 = polygon[i];
      final p2 = polygon[(i + 1) % length];

      final double lat1 = _toRadians(p1.latitude);
      final double lat2 = _toRadians(p2.latitude);
      final double lon1 = _toRadians(p1.longitude);
      final double lon2 = _toRadians(p2.longitude);

      total += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2));
    }

    final double area = total * (earthRadiusMeters * earthRadiusMeters) / 2.0;
    return area.abs();
  }

  /// Calculates the visual centroid center point of a polygon for label placement
  static LatLng calculateCentroid(List<LatLng> points) {
    if (points.isEmpty) return const LatLng(0, 0);
    double latSum = 0;
    double lngSum = 0;
    for (final p in points) {
      latSum += p.latitude;
      lngSum += p.longitude;
    }
    return LatLng(latSum / points.length, lngSum / points.length);
  }

  /// Formats square meters into metric display
  static String formatArea(double sqMeters) {
    if (sqMeters >= 1000000) {
      return '${(sqMeters / 1000000).toStringAsFixed(2)} km²';
    }
    return '${sqMeters.toStringAsFixed(0)} m²';
  }

  /// Formats distance into meters or kilometers
  static String formatDistance(double meters) {
    if (meters >= 1000) {
      return '${(meters / 1000).toStringAsFixed(2)} km';
    }
    return '${meters.toStringAsFixed(0)} m';
  }

  static double _toRadians(double degrees) => degrees * math.pi / 180.0;
  static double _toDegrees(double radians) => radians * 180.0 / math.pi;
}
