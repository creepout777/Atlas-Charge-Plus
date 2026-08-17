import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ordersService } from '../services/api/ordersService.js';
import { useAuth } from './AuthContext.jsx';

const OrderContext = createContext();

export function OrderProvider({ children }) {
  const { session, currentUser } = useAuth();
  const [ordersList, setOrdersList] = useState([]);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  // Fetch orders from Supabase database
  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await ordersService.getOrders();
      if (!error && data) {
        setOrdersList(data);
      }
    } catch (e) {
      console.warn('Error fetching orders:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // 1. Set up 3-second heartbeat synchronization
    const syncInterval = setInterval(() => {
      fetchOrders();
    }, 3000);

    // 2. Set up Supabase Realtime subscription
    const channel = ordersService.subscribeToOrders(
      session?.user?.id,
      (newOrder) => {
        setOrdersList(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
      },
      (updatedOrder) => {
        setOrdersList(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      }
    );

    return () => {
      clearInterval(syncInterval);
      channel?.unsubscribe();
    };
  }, [session, fetchOrders]);

  // Compute active order based on current user role
  const activeOrder = useMemo(() => {
    if (!currentUser) {
      return ordersList.find(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
    }

    if (currentUser.role === 'CLIENT') {
      return ordersList.find(o => o.client_user_id === currentUser.id && o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
    }

    if (currentUser.role === 'DRIVER') {
      return ordersList.find(o => o.assigned_driver_id === currentUser.id && o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
    }

    // Admins and Dispatchers see the latest active dispatch
    return ordersList.find(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
  }, [ordersList, currentUser]);

  // Create a new order (Client)
  const createOrder = async (orderData) => {
    const userId = currentUser?.id || session?.user?.id || 'a1111111-1111-1111-1111-111111111111';
    const tempId = crypto.randomUUID();
    const tempRecord = {
      id: tempId,
      client_user_id: userId,
      status: 'WAITING_APPROVAL',
      created_at: new Date().toISOString(),
      ...orderData,
    };

    setOrdersList(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await ordersService.createOrder(orderData, userId);
      if (error) {
        console.error('Create order error:', error.message);
        setOrdersList(prev => prev.filter(o => o.id !== tempId));
        throw error;
      }
      if (data) {
        setOrdersList(prev => prev.map(o => o.id === tempId ? data : o));
      }
      await fetchOrders();
      return data;
    } catch (e) {
      setOrdersList(prev => prev.filter(o => o.id !== tempId));
      throw e;
    }
  };

  // Update order status
  const updateStatus = async (orderId, statusFields) => {
    const prevList = [...ordersList];
    setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, ...statusFields } : o));

    try {
      const { data, error } = await ordersService.updateOrder(orderId, statusFields);
      if (error) {
        console.error('Update order error:', error.message);
        setOrdersList(prevList);
        throw error;
      }
      await fetchOrders();
      return data;
    } catch (e) {
      setOrdersList(prevList);
      throw e;
    }
  };

  // Claim unassigned job from queue (Driver)
  const claimOrder = async (orderId, driverId, truckId) => {
    return await updateStatus(orderId, {
      assigned_driver_id: driverId,
      assigned_truck_id: truckId,
      status: 'EN_ROUTE',
    });
  };

  // Assign Truck (Dispatcher / Admin)
  const assignTruckToOrder = async (orderId, truckId) => {
    return await updateStatus(orderId, { assigned_truck_id: truckId });
  };

  // Assign Driver (Dispatcher / Admin)
  const assignDriverToOrder = async (orderId, driverId) => {
    return await updateStatus(orderId, { assigned_driver_id: driverId });
  };

  // Delete / Cancel order
  const deleteOrder = async (orderId) => {
    const prevList = [...ordersList];
    setOrdersList(prev => prev.filter(o => o.id !== orderId));

    try {
      const { error } = await ordersService.deleteOrder(orderId);
      if (error) {
        console.error('Delete order error:', error.message);
        setOrdersList(prevList);
        throw error;
      }
      await fetchOrders();
    } catch (e) {
      setOrdersList(prevList);
      throw e;
    }
  };

  // Cancel order (sets status to CANCELED)
  const cancelOrder = async (orderId) => {
    const prevList = [...ordersList];
    setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELED' } : o));

    try {
      const { data, error } = await ordersService.updateOrder(orderId, { status: 'CANCELED' });
      if (error) {
        await ordersService.deleteOrder(orderId);
      }
      await fetchOrders();
      return data;
    } catch (e) {
      try {
        await ordersService.deleteOrder(orderId);
        await fetchOrders();
      } catch (err) {
        setOrdersList(prevList);
        throw err;
      }
    }
  };

  // Telemetry stream
  const logTelemetry = async (logData) => {
    setTelemetryLogs(prev => [logData, ...prev.slice(0, 50)]);
    try {
      await ordersService.logTelemetry(logData);
    } catch (e) {
      console.warn('Telemetry log error:', e.message);
    }
  };

  // GPS breadcrumb broadcast
  const broadcastGps = async (truckId, lat, lng, bearing = 90) => {
    const validOrderId = (activeOrder && activeOrder.id && !activeOrder.id.startsWith('ord')) ? activeOrder.id : null;
    const breadcrumb = {
      truck_id: truckId,
      order_id: validOrderId,
      lat,
      lng,
      bearing,
      speed_kmh: 38.5,
      recorded_at: new Date().toISOString(),
    };
    setBreadcrumbs(prev => [breadcrumb, ...prev.slice(0, 50)]);

    try {
      await ordersService.broadcastGps(breadcrumb);
    } catch (e) {
      console.warn('GPS broadcast error:', e.message);
    }
  };

  return (
    <OrderContext.Provider value={{
      activeOrder,
      ordersList,
      telemetryLogs,
      breadcrumbs,
      createOrder,
      updateStatus,
      claimOrder,
      cancelOrder,
      assignTruckToOrder,
      assignDriverToOrder,
      deleteOrder,
      logTelemetry,
      broadcastGps,
      refetchOrders: fetchOrders,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  return useContext(OrderContext);
}
