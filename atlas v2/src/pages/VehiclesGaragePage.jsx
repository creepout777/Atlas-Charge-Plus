import React, { useState } from 'react';
import { Car, Plus, BatteryCharging, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import Modal from '../components/layout/Modal';

export default function VehiclesGaragePage() {
  const { vehicles, connectors, addVehicle, updateVehicle, deleteVehicle, isLoading } = useData();
  const activeConnectors = connectors.filter(c => c.is_active !== false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  // Form State
  const [make, setMake] = useState('BMW');
  const [model, setModel] = useState('i4 eDrive40');
  const [year, setYear] = useState(2024);
  const [plate, setPlate] = useState('BM24 EVS');
  const [capacity, setCapacity] = useState(83.9);
  const [connectorId, setConnectorId] = useState(activeConnectors[0]?.id || connectors[0]?.id || 'e5555555-5555-5555-5555-555555555555');
  const [portLocation, setPortLocation] = useState('REAR_RIGHT');

  const openAddModal = () => {
    setMake('BMW');
    setModel('i4 eDrive40');
    setYear(2024);
    setPlate('BM24 EVS');
    setCapacity(83.9);
    setConnectorId(connectors[0]?.id || 'e5555555-5555-5555-5555-555555555555');
    setPortLocation('REAR_RIGHT');
    setShowAddModal(true);
  };

  const openEditModal = (v) => {
    setEditingVehicleId(v.id);
    setMake(v.make);
    setModel(v.model);
    setYear(v.year);
    setPlate(v.license_plate);
    setCapacity(v.battery_capacity_kwh);
    setConnectorId(v.primary_connector_id || connectors[0]?.id);
    setPortLocation(v.charge_port_location || 'REAR_RIGHT');
    setShowEditModal(true);
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    await addVehicle({
      make,
      model,
      year: parseInt(year),
      license_plate: plate,
      battery_capacity_kwh: parseFloat(capacity),
      primary_connector_id: connectorId || connectors[0]?.id,
      charge_port_location: portLocation,
    });
    setShowAddModal(false);
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (!editingVehicleId) return;
    await updateVehicle(editingVehicleId, {
      make,
      model,
      year: parseInt(year),
      license_plate: plate,
      battery_capacity_kwh: parseFloat(capacity),
      primary_connector_id: connectorId || connectors[0]?.id,
      charge_port_location: portLocation,
    });
    setShowEditModal(false);
  };

  const handleDeleteVehicle = async (v) => {
    await deleteVehicle(v.id);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Customer EV Garage</h1>
        </div>
        <button className="btn-emerald" style={{ width: 'auto' }} onClick={openAddModal}>
          <Plus size={16} /> Add Electric Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--emerald-dark)' }}>
            <Car size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No EVs in Your Garage Yet</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>Add your electric vehicle to enable one-tap mobile charging dispatch.</div>
          <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddModal}>
            <Plus size={16} /> Add Your First EV
          </button>
        </div>
      ) : (
        <div className="responsive-grid-2">
          {vehicles.map((v) => {
            const matchedConn = connectors.find(c => c.id === v.primary_connector_id);
            return (
              <div key={v.id || v.license_plate} className="card-glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '42px', height: '42px', background: 'var(--emerald-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-darker)' }}>
                      <Car size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>{v.year} {v.make} {v.model}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Plate: <b>{v.license_plate}</b></div>
                    </div>
                  </div>
                  <span className="brand-pill">{matchedConn?.code || 'CCS'} Rapid</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>BATTERY PACK</div>
                    <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)' }}>{v.battery_capacity_kwh} kWh</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CHARGE PORT</div>
                    <div style={{ fontWeight: 800, fontSize: '13px' }}>{v.charge_port_location ? v.charge_port_location.replace('_', ' ') : 'REAR RIGHT'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button className="btn-outline" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => openEditModal(v)}>
                    <Edit3 size={13} /> Edit
                  </button>
                  <button className="btn-outline" style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteVehicle(v)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add EV Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Electric Vehicle (customer_vehicles)">
        <form onSubmit={handleAddVehicle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Make</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={make} onChange={e => setMake(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Model</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={model} onChange={e => setModel(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Year</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={year} onChange={e => setYear(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Plate</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={plate} onChange={e => setPlate(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Battery Capacity (kWh)</label>
              <input className="metric-card" type="number" step="0.1" style={{ width: '100%', outline: 'none' }} value={capacity} onChange={e => setCapacity(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Primary Connector</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={connectorId} onChange={e => setConnectorId(e.target.value)}>
                {(activeConnectors.length > 0 ? activeConnectors : connectors).map(c => (
                  <option key={c.id} value={c.id}>{c.display_name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Port Location</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={portLocation} onChange={e => setPortLocation(e.target.value)}>
              <option value="REAR_LEFT">REAR_LEFT</option>
              <option value="REAR_RIGHT">REAR_RIGHT</option>
              <option value="FRONT_LEFT">FRONT_LEFT</option>
              <option value="FRONT_RIGHT">FRONT_RIGHT</option>
              <option value="NOSE">NOSE</option>
            </select>
          </div>

          <button type="submit" className="btn-emerald">
            Save Vehicle to Database
          </button>
        </form>
      </Modal>

      {/* Edit EV Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Electric Vehicle (customer_vehicles)">
        <form onSubmit={handleUpdateVehicle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Make</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={make} onChange={e => setMake(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Model</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={model} onChange={e => setModel(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Year</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={year} onChange={e => setYear(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Plate</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={plate} onChange={e => setPlate(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Battery Capacity (kWh)</label>
              <input className="metric-card" type="number" step="0.1" style={{ width: '100%', outline: 'none' }} value={capacity} onChange={e => setCapacity(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Primary Connector</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={connectorId} onChange={e => setConnectorId(e.target.value)}>
                {connectors.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name} ({c.code}) {!c.is_active ? '(Archived)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Port Location</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={portLocation} onChange={e => setPortLocation(e.target.value)}>
              <option value="REAR_LEFT">REAR_LEFT</option>
              <option value="REAR_RIGHT">REAR_RIGHT</option>
              <option value="FRONT_LEFT">FRONT_LEFT</option>
              <option value="FRONT_RIGHT">FRONT_RIGHT</option>
              <option value="NOSE">NOSE</option>
            </select>
          </div>

          <button type="submit" className="btn-emerald">
            Update Vehicle Details
          </button>
        </form>
      </Modal>
    </div>
  );
}
