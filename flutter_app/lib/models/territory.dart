import 'package:google_maps_flutter/google_maps_flutter.dart';

class Territory {
  final String id;
  final String name;
  final List<LatLng> points;
  final double areaSqMeters;
  final double perimeterMeters;
  final DateTime capturedAt;
  final int colorHex;

  Territory({
    required this.id,
    required this.name,
    required this.points,
    required this.areaSqMeters,
    required this.perimeterMeters,
    required this.capturedAt,
    required this.colorHex,
  });

  double get areaAcres => areaSqMeters * 0.000247105;
  double get areaSqKm => areaSqMeters / 1000000;
}
