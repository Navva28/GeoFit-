import 'package:google_maps_flutter/google_maps_flutter.dart';

class GpsPoint {
  final double latitude;
  final double longitude;
  final double? altitude;
  final double? speed;
  final double? accuracy;
  final DateTime timestamp;

  GpsPoint({
    required this.latitude,
    required this.longitude,
    this.altitude,
    this.speed,
    this.accuracy,
    required this.timestamp,
  });

  LatLng toLatLng() => LatLng(latitude, longitude);
}
