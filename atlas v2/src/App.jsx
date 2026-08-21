import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { OrderProvider } from './context/OrderContext';
import TopNav from './components/layout/TopNav';
import ProtectedRoute from './components/layout/ProtectedRoute';
import HomePage from './pages/HomePage';
import ClientDispatchPage from './pages/ClientDispatchPage';
import DriverCockpitPage from './pages/DriverCockpitPage';
import FleetConsolePage from './pages/FleetConsolePage';
import VehiclesGaragePage from './pages/VehiclesGaragePage';
import TariffsCatalogPage from './pages/TariffsCatalogPage';
import AnalyticsTerminalPage from './pages/AnalyticsTerminalPage';
import InvoicesHistoryPage from './pages/InvoicesHistoryPage';
import PaymentsWalletPage from './pages/PaymentsWalletPage';
import ReviewsFeedbackPage from './pages/ReviewsFeedbackPage';
import ConnectorsHardwarePage from './pages/ConnectorsHardwarePage';
import ClientProfilePage from './pages/ClientProfilePage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Smart root: shows marketing homepage for guests, role dashboard for authenticated users
function SmartHomeWrapper() {
  const { session, currentUser } = useAuth();

  if (session && currentUser) {
    if (currentUser.role === 'CLIENT') return <ClientDispatchPage />;
    if (currentUser.role === 'DRIVER') return <DriverCockpitPage />;
    if (currentUser.role === 'FLEET_DISPATCHER' || currentUser.role === 'SUPER_ADMIN') return <FleetConsolePage />;
  }

  return <HomePage />;
}

export default function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Hide native splash immediately so web animated loading screen shows instantly
      SplashScreen.hide().catch(() => {});

      // Position navbar below camera with dedicated dark status bar
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});

      // Handle Android hardware back button
      const backListener = NativeApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          NativeApp.exitApp();
        } else {
          window.history.back();
        }
      });

      return () => {
        backListener.then(l => l.remove()).catch(() => {});
      };
    }
  }, []);

  return (
    <AuthProvider>
      <DataProvider>
        <OrderProvider>
          <BrowserRouter>
            <div className="app-container">
              <TopNav />
              <main>
                <Routes>
                  {/* Public Pages */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/tariffs" element={<TariffsCatalogPage />} />
                  <Route path="/connectors" element={<ConnectorsHardwarePage />} />
                  <Route path="/reviews" element={<ReviewsFeedbackPage />} />
                  <Route path="/home" element={<HomePage />} />

                  {/* Smart Root: Landing page for guests, role dashboard for auth users */}
                  <Route path="/" element={<SmartHomeWrapper />} />

                  {/* Client Routes */}
                  <Route
                    path="/dispatch"
                    element={
                      <ProtectedRoute allowedRoles={['CLIENT', 'FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <ClientDispatchPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/vehicles"
                    element={
                      <ProtectedRoute allowedRoles={['CLIENT', 'FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <VehiclesGaragePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payments"
                    element={
                      <ProtectedRoute allowedRoles={['CLIENT', 'FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <PaymentsWalletPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute allowedRoles={['CLIENT', 'FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <InvoicesHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ClientProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Technician Cockpit: Driver + Staff */}
                  <Route
                    path="/driver"
                    element={
                      <ProtectedRoute allowedRoles={['DRIVER', 'FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <DriverCockpitPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fleet Console: Dispatcher + SuperAdmin */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <FleetConsolePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Analytics & BI: Dispatcher + SuperAdmin only */}
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['FLEET_DISPATCHER', 'SUPER_ADMIN']}>
                        <AnalyticsTerminalPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </OrderProvider>
      </DataProvider>
    </AuthProvider>
  );
}
