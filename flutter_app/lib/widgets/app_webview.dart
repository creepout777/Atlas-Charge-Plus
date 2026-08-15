import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';
import '../services/permission_service.dart';
import '../services/notification_service.dart';

/// WebView widget with JavaScript bridge for native permission access.
///
/// Injects `window.NativeApp` into the web content so JavaScript can
/// request native Flutter permissions (location, notifications, camera).
class AppWebView extends StatefulWidget {
  final String url;
  const AppWebView({super.key, required this.url});

  @override
  State<AppWebView> createState() => _AppWebViewState();
}

class _AppWebViewState extends State<AppWebView> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) => _injectBridge(),
        onWebResourceError: (error) {
          debugPrint('[WebView Error] ${error.description}');
        },
      ))
      ..setOnPermissionRequest((request) {
        // Auto-grant WebView permission prompts (e.g., camera in WebView)
        request.grant();
      })
      ..addJavaScriptChannel(
        'FlutterBridge',
        onMessageReceived: (message) => _handleBridgeMessage(message.message),
      )
      ..setBackgroundColor(const Color(0xFFF8FAFC))
      ..loadRequest(Uri.parse(widget.url));
  }

  /// Inject the NativeApp bridge object into the web page.
  void _injectBridge() {
    _controller.runJavaScript('''
      window.NativeApp = {
        requestLocation: () => FlutterBridge.postMessage('REQUEST_LOCATION'),
        requestNotifications: () => FlutterBridge.postMessage('REQUEST_NOTIFICATIONS'),
        requestCamera: () => FlutterBridge.postMessage('REQUEST_CAMERA'),
        shareLocation: () => FlutterBridge.postMessage('SHARE_LOCATION'),
        showNotification: (data) => FlutterBridge.postMessage('SHOW_NOTIFICATION:' + data),
      };
      console.log('[Atlas Charge Plus+] NativeApp bridge injected');
    ''');
  }

  /// Handle messages from the web content via the bridge.
  Future<void> _handleBridgeMessage(String message) async {
    if (message == 'REQUEST_LOCATION') {
      final granted = await PermissionService.request(
        Permission.locationWhenInUse,
      );
      if (granted) {
        try {
          final pos = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
          );
          _controller.runJavaScript(
            'window.onLocationResult(${pos.latitude}, ${pos.longitude})',
          );
        } catch (e) {
          debugPrint('[Location Error] $e');
        }
      }
    } else if (message == 'REQUEST_NOTIFICATIONS') {
      final granted = await PermissionService.request(
        Permission.notification,
      );
      _controller.runJavaScript(
        'window.onNotificationResult($granted)',
      );
    } else if (message == 'REQUEST_CAMERA') {
      await PermissionService.request(Permission.camera);
    } else if (message == 'SHARE_LOCATION') {
      final granted = await PermissionService.request(
        Permission.locationWhenInUse,
      );
      if (granted) {
        try {
          final pos = await Geolocator.getCurrentPosition();
          _controller.runJavaScript(
            'window.onLocationResult(${pos.latitude}, ${pos.longitude})',
          );
        } catch (e) {
          debugPrint('[Share Location Error] $e');
        }
      }
    } else if (message.startsWith('SHOW_NOTIFICATION:')) {
      final data = message.substring('SHOW_NOTIFICATION:'.length);
      try {
        final json = jsonDecode(data);
        await NotificationService.show(
          title: json['title'] ?? 'Atlas Charge Plus+',
          body: json['body'] ?? '',
        );
      } catch (e) {
        debugPrint('[Notification Error] $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: _controller);
  }
}
