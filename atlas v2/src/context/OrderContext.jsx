import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ordersService } from '../services/api/ordersService.js';
import { useAuth } from './AuthContext.jsx';

const OrderContext = createContext();

export function OrderProvider({ children }) {
  const { session } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  // Fetch orders from database
  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await ordersService.getOrders();
      if (!error && data) {
        setOrdersList(data);
        const active = data.find(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED');
        if (active) setActiveOrder(active);
      }
    } catch (e) {
      console.warn('Error fetching orders:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Set up Realtime subscription
    const channel = ordersService.subscribeToOrders(
      session?.user?.id,
      (newOrder) => {
        setOrdersList(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
        setActiveOrder(newOrder);
      },
      (updatedOrder) => {
        setOrdersList(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setActiveOrder(curr => (curr && curr.id === updatedOrder.id) ? updatedOrder : curr);
      }
    );

    return () => {
      channel?.unsubscribe();
    };
  }, [session, fetchOrders]);

  // Create a new order
  const createOrder = async (orderData) => {
    const userId = session?.user?.id || 'a1111111-1111-1111-1111-111111111111';
    const tempId = crypto.randomUUID();
    const tempRecord = {
      id: tempId,
      client_user_id: userId,
      status: 'WAITING_APPROVAL',
      created_at: new Date().toISOString(),
      ...orderData,
    };

    setActiveOrder(tempRecord);
    setOrdersList(prev => [tempRecord, ...prev]);

    try {
      const { data, error } = await ordersService.createOrder(orderData, userId);
      if (error) {
        console.error('Create order error:', error.message);
        setOrdersList(prev => prev.filter(o => o.id !== tempId));
        if (activeOrder?.id === tempId) setActiveOrder(null);
        throw error;
      }
      if (data) {
        setActiveOrder(data);
        setOrdersList(prev => prev.map(o => o.id === tempId ? data : o));
      }
      await fetchOrders();
      return data;
    } catch (e) {
      setOrdersList(prev => prev.filter(o => o.id !== tempId));
      if (activeOrder?.id === tempId) setActiveOrder(null);
      throw e;
    }
  };

  const updateStatus = async (orderId, statusFields) => {
    const prevActive = activeOrder;
    const prevList = [...ordersList];

    setActiveOrder(prev => prev && prev.id === orderId ? { ...prev, ...statusFields } : prev);
    setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, ...statusFields } : o));

    try {
      const { data, error } = await ordersService.updateOrder(orderId, statusFields);
      if (error) {
        console.error('Update order error:', error.message);
        setActiveOrder(prevActive);
        setOrdersList(prevList);
        throw error;
      }
      await fetchOrders();
      return data;
    } catch (e) {
      setActiveOrder(prevActive);
      setOrdersList(prevList);
      throw e;
    }
  };

  const assignTruckToOrder = async (orderId, truckId) => {
    return await updateStatus(orderId, { assigned_truck_id: truckId });
  };

  const assignDriverToOrder = async (orderId, driverId) => {
    return await updateStatus(orderId, { assigned_driver_id: driverId });
  };

  const deleteOrder = async (orderId) => {
    const prevActive = activeOrder;
    const prevList = [...ordersList];

    setActiveOrder(prev => prev && prev.id === orderId ? null : prev);
    setOrdersList(prev => prev.filter(o => o.id !== orderId));

    try {
      const { error } = await ordersService.deleteOrder(orderId);
      if (error) {
        console.error('Delete order error:', error.message);
        setActiveOrder(prevActive);
        setOrdersList(prevList);
        throw error;
      }
      await fetchOrders();
    } catch (e) {
      setActiveOrder(prevActive);
      setOrdersList(prevList);
      throw e;
    }
  };

  const logTelemetry = async (logData) => {
    setTelemetryLogs(prev => [logData, ...prev.slice(0, 50)]);
    try {
      await ordersService.logTelemetry(logData);
    } catch (e) {
      console.warn('Telemetry log error:', e.message);
    }
  };

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
      setActiveOrder,
      ordersList,
      telemetryLogs,
      breadcrumbs,
      createOrder,
      updateStatus,
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
