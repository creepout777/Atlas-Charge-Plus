import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

/// Unified permission service that abstracts platform differences.
/// Uses [kIsWeb] to skip native calls on web (browser handles permissions natively).
class PermissionService {
  /// Request a single permission. Returns true if granted.
  /// On web, returns true (browser handles permissions natively).
  static Future<bool> request(Permission permission) async {
    if (kIsWeb) return true;

    final status = await permission.status;
    if (status.isGranted) return true;

    final result = await permission.request();

    if (result.isPermanentlyDenied) {
      await openAppSettings();
      return false;
    }

    return result.isGranted;
  }

  /// Request multiple permissions at once.
  static Future<Map<Permission, bool>> requestMultiple(
    List<Permission> permissions,
  ) async {
    if (kIsWeb) {
      return {for (var p in permissions) p: true};
    }

    final results = await permissions.request();
    return results.map(
      (key, value) => MapEntry(key, value.isGranted),
    );
  }

  /// Check permission status without requesting.
  static Future<bool> isGranted(Permission permission) async {
    if (kIsWeb) return true;
    return await permission.isGranted;
  }
}
