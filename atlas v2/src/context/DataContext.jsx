import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tariffsService } from '../services/api/tariffsService.js';
import { fleetService } from '../services/api/fleetService.js';
import { driversService } from '../services/api/driversService.js';
import { vehiclesService } from '../services/api/vehiclesService.js';
import { paymentsService } from '../services/api/paymentsService.js';
import { reviewsService } from '../services/api/reviewsService.js';
import { systemService } from '../services/api/systemService.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { session, currentUser } = useAuth();

  // Public Catalogs & Fleet Data State
  const [connectors, setConnectors] = useState([]);
  const [truckConnectors, setTruckConnectors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [uiLabels, setUiLabels] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // User-Scoped Protected Data State
  const [vehicles, setVehicles] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Refetch Functions ──────────────────────────────────────────
  const refetchTariffs = useCallback(async () => {
    const { data, error } = await tariffsService.getTariffs();
    if (!error && data !== undefined && data !== null) setTariffs(data);
  }, []);

  const refetchPackages = useCallback(async () => {
    const { data, error } = await tariffsService.getPackages();
    if (!error && data !== undefined && data !== null) setPackages(data);
  }, []);

  const refetchConnectors = useCallback(async () => {
    const { data, error } = await fleetService.getConnectors();
    if (!error && data !== undefined && data !== null) setConnectors(data);
  }, []);

  const refetchTruckConnectors = useCallback(async () => {
    const { data, error } = await fleetService.getTruckConnectors();
    if (!error && data !== undefined && data !== null) setTruckConnectors(data);
  }, []);

  const refetchTrucks = useCallback(async () => {
    const { data, error } = await fleetService.getTrucks();
    if (!error && data !== undefined && data !== null) setTrucks(data);
  }, []);

  const refetchDrivers = useCallback(async () => {
    const { data, error } = await driversService.getDrivers();
    if (!error && data !== undefined && data !== null) setDrivers(data);
  }, []);

  const refetchUiLabels = useCallback(async () => {
    const { data, error } = await systemService.getLabels();
    if (!error && data !== undefined && data !== null) setUiLabels(data);
  }, []);

  const refetchVehicles = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const { data, error } = await vehiclesService.getVehicles(userId);
    if (!error && data !== undefined && data !== null) {
      setVehicles(data);
    }
  }, [session]);

  const refetchPaymentMethods = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const { data, error } = await paymentsService.getPaymentMethods(userId);
    if (!error && data !== undefined && data !== null) {
      setPaymentMethods(data);
    }
  }, [session]);

  const refetchInvoices = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const { data, error } = await paymentsService.getInvoices(userId);
    if (!error && data !== undefined && data !== null) {
      setInvoices(data);
    }
  }, [session]);

  const refetchReviews = useCallback(async () => {
    const { data, error } = await reviewsService.getReviews();
    if (!error && data !== undefined && data !== null) {
      setReviews(data);
    }
  }, []);

  // ── Fetch Catalogs & Fleet Data ────────────────────────────────
  useEffect(() => {
    async function loadAllCatalogs() {
      try {
        const [
          { data: cData },
          { data: tcData },
          { data: pkgData },
          { data: tData },
          { data: lblData },
          { data: trkData },
          { data: dData },
          { data: revData },
        ] = await Promise.all([
          fleetService.getConnectors(),
          fleetService.getTruckConnectors(),
          tariffsService.getPackages(),
          tariffsService.getTariffs(),
          systemService.getLabels(),
          fleetService.getTrucks(),
          driversService.getDrivers(),
          reviewsService.getReviews(),
        ]);

        if (cData !== undefined && cData !== null) setConnectors(cData);
        if (tcData !== undefined && tcData !== null) setTruckConnectors(tcData);
        if (pkgData !== undefined && pkgData !== null) setPackages(pkgData);
        if (tData !== undefined && tData !== null) setTariffs(tData);
        if (lblData !== undefined && lblData !== null) setUiLabels(lblData);
        if (trkData !== undefined && trkData !== null) setTrucks(trkData);
        if (dData !== undefined && dData !== null) setDrivers(dData);
        if (revData !== undefined && revData !== null) setReviews(revData);
      } catch (err) {
        console.warn('Error loading public catalogs from database:', err.message);
      }
    }

    loadAllCatalogs();

    const fleetInterval = setInterval(() => {
      refetchTrucks();
      refetchDrivers();
    }, 4000);

    return () => clearInterval(fleetInterval);
  }, [session, refetchTrucks, refetchDrivers]);

  // ── Fetch User-Scoped Protected Data ───────────────────────────
  useEffect(() => {
    if (!session?.user) {
      setVehicles([]);
      setPaymentMethods([]);
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    async function loadUserData() {
      setIsLoading(true);
      try {
        const userId = session.user.id;
        const [
          { data: vData },
          { data: pmData },
          { data: invData },
        ] = await Promise.all([
          vehiclesService.getVehicles(userId),
          paymentsService.getPaymentMethods(userId),
          paymentsService.getInvoices(userId),
        ]);

        if (vData !== undefined && vData !== null) setVehicles(vData);
        if (pmData !== undefined && pmData !== null) setPaymentMethods(pmData);
        if (invData !== undefined && invData !== null) setInvoices(invData);
      } catch (err) {
        console.warn('Error loading user-scoped data:', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, [session]);

  // ── Vehicle Operations ─────────────────────────────────────────
  const addVehicle = async (vehData) => {
    const userId = session?.user?.id || 'a1111111-1111-1111-1111-111111111111';
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, user_id: userId, ...vehData };
    setVehicles(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await vehiclesService.createVehicle(vehData, userId);
      if (error) {
        console.error('Create vehicle error:', error.message);
        setVehicles(prev => prev.filter(v => v.id !== tempId));
        throw error;
      }
      await refetchVehicles();
      return data;
    } catch (e) {
      setVehicles(prev => prev.filter(v => v.id !== tempId));
      throw e;
    }
  };

  const updateVehicle = async (id, vehData) => {
    const prevList = [...vehicles];
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...vehData } : v));

    try {
      const { error } = await vehiclesService.updateVehicle(id, vehData);
      if (error) {
        console.error('Update vehicle error:', error.message);
        setVehicles(prevList);
        throw error;
      }
      await refetchVehicles();
    } catch (e) {
      setVehicles(prevList);
      throw e;
    }
  };

  const deleteVehicle = async (id) => {
    const prevList = [...vehicles];
    setVehicles(prev => prev.filter(v => v.id !== id));

    try {
      const { error } = await vehiclesService.deleteVehicle(id);
      if (error) {
        console.error('Delete vehicle error:', error.message);
        setVehicles(prevList);
        throw error;
      }
      await refetchVehicles();
    } catch (e) {
      setVehicles(prevList);
      throw e;
    }
  };

  // ── Payment Method Operations ──────────────────────────────────
  const addPaymentMethod = async (pmData) => {
    const userId = session?.user?.id || 'a1111111-1111-1111-1111-111111111111';
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, user_id: userId, ...pmData };
    setPaymentMethods(prev => [...prev, tempRecord]);

    try {
      const { data, error } = await paymentsService.createPaymentMethod(pmData, userId);
      if (error) {
        console.error('Add payment method error:', error.message);
        setPaymentMethods(prev => prev.filter(p => p.id !== tempId));
        throw error;
      }
      await refetchPaymentMethods();
      return data;
    } catch (e) {
      setPaymentMethods(prev => prev.filter(p => p.id !== tempId));
      throw e;
    }
  };

  const setDefaultPaymentMethod = async (id) => {
    const prevList = [...paymentMethods];
    setPaymentMethods(prev => prev.map(p => ({ ...p, is_default: p.id === id })));

    try {
      const { error } = await paymentsService.setDefaultPaymentMethod(id, session?.user?.id);
      if (error) {
        console.error('Set default payment error:', error.message);
        setPaymentMethods(prevList);
        throw error;
      }
      await refetchPaymentMethods();
    } catch (e) {
      setPaymentMethods(prevList);
      throw e;
    }
  };

  const deletePaymentMethod = async (id) => {
    const prevList = [...paymentMethods];
    setPaymentMethods(prev => prev.filter(p => p.id !== id));

    try {
      const { error } = await paymentsService.deletePaymentMethod(id);
      if (error) {
        console.error('Delete payment method error:', error.message);
        setPaymentMethods(prevList);
        throw error;
      }
    } catch (e) {
      setPaymentMethods(prevList);
      throw e;
    }
  };

  // ── Invoices Operations ────────────────────────────────────────
  const addInvoice = async (invoiceData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, issued_at: new Date().toISOString(), ...invoiceData };
    setInvoices(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await paymentsService.createInvoice(invoiceData);
      if (error) {
        console.error('Create invoice error:', error.message);
        setInvoices(prev => prev.filter(inv => inv.id !== tempId));
        throw error;
      }
      await refetchInvoices();
      return data;
    } catch (e) {
      setInvoices(prev => prev.filter(inv => inv.id !== tempId));
      throw e;
    }
  };

  // ── Reviews Operations ─────────────────────────────────────────
  const addReview = async (reviewData) => {
    const userId = session?.user?.id || 'a1111111-1111-1111-1111-111111111111';
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, client_user_id: userId, created_at: new Date().toISOString(), ...reviewData };
    setReviews(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await reviewsService.createReview(reviewData, userId);
      if (error) {
        console.error('Create review error:', error.message);
        setReviews(prev => prev.filter(r => r.id !== tempId));
        throw error;
      }

      // Update driver's rating_score in driver_profiles if driver_user_id exists
      if (reviewData.driver_user_id) {
        try {
          const allDriverReviews = [...reviews.filter(r => r.driver_user_id === reviewData.driver_user_id), tempRecord];
          const avg = allDriverReviews.reduce((s, r) => s + (parseFloat(r.rating_stars) || 5), 0) / allDriverReviews.length;
          const newScore = parseFloat(avg.toFixed(2));

          await supabase
            .from('driver_profiles')
            .update({ rating_score: newScore })
            .eq('user_id', reviewData.driver_user_id);

          await refetchDrivers();
        } catch (drvErr) {
          console.warn('Driver score sync error:', drvErr);
        }
      }

      await refetchReviews();
      return data;
    } catch (e) {
      setReviews(prev => prev.filter(r => r.id !== tempId));
      throw e;
    }
  };

  // ── Fleet Trucks Operations ────────────────────────────────────
  const addTruck = async (truckData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, ...truckData };
    setTrucks(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await fleetService.createTruck(truckData);
      if (error) {
        console.error('Create truck error:', error.message);
        setTrucks(prev => prev.filter(t => t.id !== tempId));
        throw error;
      }
      await refetchTrucks();
      return data;
    } catch (e) {
      setTrucks(prev => prev.filter(t => t.id !== tempId));
      throw e;
    }
  };

  const updateTruck = async (id, truckData) => {
    const prevList = [...trucks];
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, ...truckData } : t));

    try {
      const { error } = await fleetService.updateTruck(id, truckData);
      if (error) {
        console.error('Update truck error:', error.message);
        setTrucks(prevList);
        throw error;
      }
      await refetchTrucks();
    } catch (e) {
      setTrucks(prevList);
      throw e;
    }
  };

  const deleteTruck = async (id) => {
    const prevTrucks = [...trucks];
    const prevDrivers = [...drivers];
    setDrivers(prev => prev.map(d => d.assigned_truck_id === id ? { ...d, assigned_truck_id: null } : d));
    setTrucks(prev => prev.filter(t => t.id !== id));

    try {
      const { error } = await fleetService.deleteTruck(id);
      if (error) {
        console.error('Delete truck error:', error.message);
        setTrucks(prevTrucks);
        setDrivers(prevDrivers);
        throw error;
      }
      await refetchTrucks();
      await refetchDrivers();
    } catch (e) {
      setTrucks(prevTrucks);
      setDrivers(prevDrivers);
      throw e;
    }
  };

  // ── Drivers Operations ─────────────────────────────────────────
  const addDriver = async (driverData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { user_id: tempId, full_name: driverData.full_name, duty_status: 'AVAILABLE', ...driverData };
    setDrivers(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await driversService.createDriver(driverData);
      if (error) {
        console.error('Create driver error:', error.message);
        setDrivers(prev => prev.filter(d => d.user_id !== tempId));
        throw error;
      }
      await refetchDrivers();
      return data;
    } catch (e) {
      setDrivers(prev => prev.filter(d => d.user_id !== tempId));
      throw e;
    }
  };

  const updateDriver = async (userId, driverData) => {
    const prevList = [...drivers];
    setDrivers(prev => prev.map(d => d.user_id === userId ? { ...d, ...driverData } : d));

    try {
      const { error } = await driversService.updateDriver(userId, driverData);
      if (error) {
        console.error('Update driver error:', error.message);
        setDrivers(prevList);
        throw error;
      }
      await refetchDrivers();
    } catch (e) {
      setDrivers(prevList);
      throw e;
    }
  };

  const deleteDriver = async (userId) => {
    const prevList = [...drivers];
    setDrivers(prev => prev.filter(d => d.user_id !== userId));

    try {
      const { error } = await driversService.deleteDriver(userId);
      if (error) {
        console.error('Delete driver error:', error.message);
        setDrivers(prevList);
        throw error;
      }
      await refetchDrivers();
    } catch (e) {
      setDrivers(prevList);
      throw e;
    }
  };

  // ── Connector Types Operations ─────────────────────────────────
  const addConnector = async (connData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, standard: 'CCS_COMBO2', is_active: true, ...connData };
    setConnectors(prev => [...prev, tempRecord]);

    try {
      const { data, error } = await fleetService.createConnector(connData);
      if (error) {
        console.error('Create connector error:', error.message);
        setConnectors(prev => prev.filter(c => c.id !== tempId));
        throw error;
      }
      await refetchConnectors();
      return data;
    } catch (e) {
      setConnectors(prev => prev.filter(c => c.id !== tempId));
      throw e;
    }
  };

  const updateConnector = async (id, connData) => {
    const prevList = [...connectors];
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, ...connData } : c));

    try {
      const { error } = await fleetService.updateConnector(id, connData);
      if (error) {
        console.error('Update connector error:', error.message);
        setConnectors(prevList);
        throw error;
      }
      await refetchConnectors();
    } catch (e) {
      setConnectors(prevList);
      throw e;
    }
  };

  const deleteConnector = async (id) => {
    const prevList = [...connectors];
    // Optimistically mark inactive
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, is_active: false } : c));

    try {
      const { error } = await fleetService.deleteConnector(id);
      if (error) {
        console.error('Delete connector error:', error.message);
      }
      await refetchConnectors();
    } catch (e) {
      setConnectors(prevList);
      throw e;
    }
  };

  const toggleConnectorActive = async (id, isActive) => {
    const prevList = [...connectors];
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c));

    try {
      const { error } = await fleetService.toggleConnectorActive(id, isActive);
      if (error) {
        console.error('Toggle connector active error:', error.message);
        setConnectors(prevList);
        throw error;
      }
      await refetchConnectors();
    } catch (e) {
      setConnectors(prevList);
      throw e;
    }
  };

  // ── Truck Connectors Operations ────────────────────────────────
  const addTruckConnector = async (tcData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, is_operational: true, ...tcData };
    setTruckConnectors(prev => [...prev, tempRecord]);

    try {
      const { data, error } = await fleetService.createTruckConnector(tcData);
      if (error) {
        console.error('Create truck connector error:', error.message);
        setTruckConnectors(prev => prev.filter(tc => tc.id !== tempId));
        throw error;
      }
      await refetchTruckConnectors();
      return data;
    } catch (e) {
      setTruckConnectors(prev => prev.filter(tc => tc.id !== tempId));
      throw e;
    }
  };

  const updateTruckConnector = async (id, tcData) => {
    const prevList = [...truckConnectors];
    setTruckConnectors(prev => prev.map(tc => tc.id === id ? { ...tc, ...tcData } : tc));

    try {
      const { error } = await fleetService.updateTruckConnector(id, tcData);
      if (error) {
        console.error('Update truck connector error:', error.message);
        setTruckConnectors(prevList);
        throw error;
      }
      await refetchTruckConnectors();
    } catch (e) {
      setTruckConnectors(prevList);
      throw e;
    }
  };

  const deleteTruckConnector = async (id) => {
    const prevList = [...truckConnectors];
    setTruckConnectors(prev => prev.filter(tc => tc.id !== id));

    try {
      const { error } = await fleetService.deleteTruckConnector(id);
      if (error) {
        console.error('Delete truck connector error:', error.message);
        setTruckConnectors(prevList);
        throw error;
      }
      await refetchTruckConnectors();
    } catch (e) {
      setTruckConnectors(prevList);
      throw e;
    }
  };

  // ── Pricing Tariffs Operations ─────────────────────────────────
  const addTariff = async (tariffData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, is_active: true, ...tariffData };
    setTariffs(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await tariffsService.createTariff(tariffData);
      if (error) {
        console.error('Create tariff error:', error.message);
        setTariffs(prev => prev.filter(t => t.id !== tempId));
        throw error;
      }
      await refetchTariffs();
      return data;
    } catch (e) {
      setTariffs(prev => prev.filter(t => t.id !== tempId));
      throw e;
    }
  };

  const updateTariff = async (id, tariffData) => {
    const prevList = [...tariffs];
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, ...tariffData } : t));

    try {
      const { error } = await tariffsService.updateTariff(id, tariffData);
      if (error) {
        console.error('Update tariff error:', error.message);
        setTariffs(prevList);
        throw error;
      }
      await refetchTariffs();
    } catch (e) {
      setTariffs(prevList);
      throw e;
    }
  };

  const deleteTariff = async (id) => {
    const prevList = [...tariffs];
    // Optimistically mark inactive / remove
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t));

    try {
      const { error } = await tariffsService.deleteTariff(id);
      if (error) {
        console.error('Delete tariff error:', error.message);
      }
      await refetchTariffs();
    } catch (e) {
      setTariffs(prevList);
      throw e;
    }
  };

  const toggleTariffActive = async (id, isActive) => {
    const prevList = [...tariffs];
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, is_active: isActive } : t));

    try {
      const { error } = await tariffsService.toggleTariffActive(id, isActive);
      if (error) {
        console.error('Toggle tariff active error:', error.message);
        setTariffs(prevList);
        throw error;
      }
      await refetchTariffs();
    } catch (e) {
      setTariffs(prevList);
      throw e;
    }
  };

  // ── Charge Packages Operations ─────────────────────────────────
  const addPackage = async (pkgData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, is_active: true, ...pkgData };
    setPackages(prev => [...prev, tempRecord]);

    try {
      const { data, error } = await tariffsService.createPackage(pkgData);
      if (error) {
        console.error('Create package error:', error.message);
        setPackages(prev => prev.filter(p => p.id !== tempId));
        throw error;
      }
      await refetchPackages();
      return data;
    } catch (e) {
      setPackages(prev => prev.filter(p => p.id !== tempId));
      throw e;
    }
  };

  const updatePackage = async (id, pkgData) => {
    const prevList = [...packages];
    setPackages(prev => prev.map(p => p.id === id ? { ...p, ...pkgData } : p));

    try {
      const { error } = await tariffsService.updatePackage(id, pkgData);
      if (error) {
        console.error('Update package error:', error.message);
        setPackages(prevList);
        throw error;
      }
      await refetchPackages();
    } catch (e) {
      setPackages(prevList);
      throw e;
    }
  };

  const deletePackage = async (id) => {
    const prevList = [...packages];
    // Optimistically mark inactive
    setPackages(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));

    try {
      const { error } = await tariffsService.deletePackage(id);
      if (error) {
        console.error('Delete package error:', error.message);
      }
      await refetchPackages();
    } catch (e) {
      setPackages(prevList);
      throw e;
    }
  };

  const togglePackageActive = async (id, isActive) => {
    const prevList = [...packages];
    setPackages(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));

    try {
      const { error } = await tariffsService.togglePackageActive(id, isActive);
      if (error) {
        console.error('Toggle package active error:', error.message);
        setPackages(prevList);
        throw error;
      }
      await refetchPackages();
    } catch (e) {
      setPackages(prevList);
      throw e;
    }
  };

  // ── UI Localization Labels Operations ──────────────────────────
  const addUiLabel = async (lblData) => {
    const tempId = crypto.randomUUID();
    const tempRecord = { id: tempId, ...lblData };
    setUiLabels(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await systemService.createLabel(lblData);
      if (error) {
        console.error('Create label error:', error.message);
        setUiLabels(prev => prev.filter(l => l.id !== tempId));
        throw error;
      }
      await refetchUiLabels();
      return data;
    } catch (e) {
      setUiLabels(prev => prev.filter(l => l.id !== tempId));
      throw e;
    }
  };

  const updateUiLabel = async (id, labelData) => {
    const prevList = [...uiLabels];
    setUiLabels(prev => prev.map(l => l.id === id ? { ...l, ...labelData } : l));

    try {
      const { error } = await systemService.updateLabel(id, labelData);
      if (error) {
        console.error('Update label error:', error.message);
        setUiLabels(prevList);
        throw error;
      }
      await refetchUiLabels();
    } catch (e) {
      setUiLabels(prevList);
      throw e;
    }
  };

  const deleteUiLabel = async (id) => {
    const prevList = [...uiLabels];
    setUiLabels(prev => prev.filter(l => l.id !== id));

    try {
      const { error } = await systemService.deleteLabel(id);
      if (error) {
        console.error('Delete label error:', error.message);
        setUiLabels(prevList);
        throw error;
      }
      await refetchUiLabels();
    } catch (e) {
      setUiLabels(prevList);
      throw e;
    }
  };

  return (
    <DataContext.Provider value={{
      vehicles,
      connectors,
      truckConnectors,
      packages,
      tariffs,
      paymentMethods,
      invoices,
      reviews,
      uiLabels,
      trucks,
      drivers,
      isLoading,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addPaymentMethod,
      setDefaultPaymentMethod,
      deletePaymentMethod,
      addInvoice,
      addReview,
      updateTruck,
      addTruck,
      deleteTruck,
      addDriver,
      updateDriver,
      deleteDriver,
      addConnector,
      updateConnector,
      deleteConnector,
      toggleConnectorActive,
      addTruckConnector,
      updateTruckConnector,
      deleteTruckConnector,
      addTariff,
      updateTariff,
      deleteTariff,
      toggleTariffActive,
      addPackage,
      updatePackage,
      deletePackage,
      togglePackageActive,
      addUiLabel,
      updateUiLabel,
      deleteUiLabel,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
