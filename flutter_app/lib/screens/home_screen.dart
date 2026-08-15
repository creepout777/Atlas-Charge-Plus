import 'package:flutter/material.dart';
import '../widgets/app_webview.dart';

/// Home screen: full-screen WebView loading the Atlas Charge Plus+ web app.
class HomeScreen extends StatelessWidget {
  /// URL of the hosted web app.
  /// For local dev: 'http://localhost:8080' or 'http://10.0.2.2:8080' (Android emulator)
  /// For production: your deployed URL (e.g., 'https://atlas-charge.example.com')
  static const String webAppUrl = 'https://atlas-charge-plus.example.com';

  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      body: SafeArea(
        top: false, // Let WebView handle safe area via CSS env()
        child: AppWebView(url: webAppUrl),
      ),
    );
  }
}
