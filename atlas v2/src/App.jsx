import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { OrderProvider } from './context/OrderContext';
import TopNav from './components/layout/TopNav';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LogoLoadingScreen from './components/shared/LogoLoadingScreen';

const HomePage = lazy(() => import('./pages/HomePage'));
const ClientDispatchPage = lazy(() => import('./pages/ClientDispatchPage'));
const DriverCockpitPage = lazy(() => import('./pages/DriverCockpitPage'));
const FleetConsolePage = lazy(() => import('./pages/FleetConsolePage'));
const VehiclesGaragePage = lazy(() => import('./pages/VehiclesGaragePage'));
const TariffsCatalogPage = lazy(() => import('./pages/TariffsCatalogPage'));
const AnalyticsTerminalPage = lazy(() => import('./pages/AnalyticsTerminalPage'));
const InvoicesHistoryPage = lazy(() => import('./pages/InvoicesHistoryPage'));
const PaymentsWalletPage = lazy(() => import('./pages/PaymentsWalletPage'));
const ReviewsFeedbackPage = lazy(() => import('./pages/ReviewsFeedbackPage'));
const ConnectorsHardwarePage = lazy(() => import('./pages/ConnectorsHardwarePage'));
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

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
                <Suspense fallback={<LogoLoadingScreen message="Loading" />}>
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

                    {/* Driver Route */}
                    <Route
                      path="/driver"
                      element={
                        <ProtectedRoute allowedRoles={['DRIVER']}>
                          <DriverCockpitPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Fleet Dispatcher Route */}
                    <Route
                      path="/fleet"
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
                </Suspense>
              </main>
            </div>
          </BrowserRouter>
        </OrderProvider>
      </DataProvider>
    </AuthProvider>
  );
}
