import { useState, useEffect, useMemo } from 'react';
import './App.css';

export default function App() {
  const [items, setItems] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [qrCode, setQrCode] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'last_updated', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({ 
    name: '', sku: '', category: 'Raw Materials', location: '', 
    quantity: '', reorder_point: 10, price: '', supplier: '' 
  });

  // Fetch initial data when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const logActivity = (action) => {
    setActivities(prev => [{ id: Date.now(), text: action, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 8));
  };

  const fetchItems = () => {
    const API_URL = window.location.hostname === 'localhost'
      ? 'http://127.0.0.1:8000/api/items/'
      : 'https://inventory-backend-z2ux.onrender.com/api/items/';

    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setItems(data); 
      })
      .catch(err => console.error("Error fetching items:", err));
  };
  
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      ...form,
      quantity: form.quantity !== '' ? Number(form.quantity) : 0,
      reorder_point: form.reorder_point !== '' ? Number(form.reorder_point) : 0,
      price: form.price !== '' ? Number(form.price) : 0,
    };

    const API_URL = window.location.hostname === 'localhost' 
      ? 'http://127.0.0.1:8000/api/items/' 
      : 'https://inventory-backend-z2ux.onrender.com/api/items/';

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(response => {
      if (!response.ok) {
        return response.json().then(errData => { throw new Error(JSON.stringify(errData)); });
      }
      return response.json();
    }).then(() => {
      showToast(`Asset registered: ${form.sku}`, 'success');
      logActivity(`Registered new item: ${form.sku}`);
      setForm({ name: '', sku: '', category: 'Raw Materials', location: '', quantity: '', reorder_point: 10, price: '', supplier: '' });
      fetchItems();
    }).catch(err => {
      console.error("Error saving record:", err);
      showToast('Error saving record', 'error');
    });
  };

  const deleteItem = (id, sku) => {
    const API_URL = window.location.hostname === 'localhost'
      ? `http://127.0.0.1:8000/api/items/${id}/`
      : `https://inventory-backend-z2ux.onrender.com/api/items/${id}/`;

    fetch(API_URL, { method: 'DELETE' })
      .then(() => {
        showToast(`Asset deleted: ${sku}`, 'danger');
        logActivity(`Deleted item: ${sku}`);
        fetchItems();
      })
      .catch(err => {
        console.error("Error deleting item:", err);
        showToast('Error deleting record', 'error');
      });
  };

  const adjustStock = (item, amount) => {
    const newQty = Math.max(0, item.quantity + amount);
    const API_URL = window.location.hostname === 'localhost'
      ? `http://127.0.0.1:8000/api/items/${item.id}/`
      : `https://inventory-backend-z2ux.onrender.com/api/items/${item.id}/`;

    fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty })
    }).then(() => {
      showToast(`Stock updated: ${item.sku}`, 'info');
      logActivity(`Adjusted stock for ${item.sku} (${amount > 0 ? '+' : ''}${amount})`);
      fetchItems();
    }).catch(err => {
      console.error("Error adjusting stock:", err);
      showToast('Error updating stock', 'error');
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedItems = useMemo(() => {
    let filtered = items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, searchTerm, sortConfig]);

  const { totalValue, lowStockCount, categoryData, uniqueVendors, forecastingData } = useMemo(() => {
    let val = 0, low = 0, cat = {}, ven = {}, forecast = [];
    items.forEach(item => {
      const itemValue = item.price * item.quantity;
      val += itemValue;
      if (item.quantity <= item.reorder_point) low++;
      
      if (!cat[item.category]) cat[item.category] = { value: 0, count: 0 };
      cat[item.category].value += itemValue;
      cat[item.category].count += 1;

      if (!ven[item.supplier]) ven[item.supplier] = { items: [], totalValue: 0 };
      if (!ven[item.supplier].items.includes(item.name)) ven[item.supplier].items.push(item.name);
      ven[item.supplier].totalValue += itemValue;

      const burnRate = Math.max(1, Math.floor((item.reorder_point / 7) + (item.price < 500 ? 5 : 1)));
      forecast.push({ ...item, burnRate, daysLeft: Math.floor(item.quantity / burnRate) });
    });
    return { totalValue: val, lowStockCount: low, categoryData: cat, uniqueVendors: ven, forecastingData: forecast.sort((a,b)=>a.daysLeft-b.daysLeft) };
  }, [items]);

  return (
    <div className="app-layout">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>

      {/* QR Code Modal */}
      {qrCode && (
        <div className="modal-backdrop" onClick={() => setQrCode(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Asset Tracking Tag</h3>
              <button className="btn-close" onClick={() => setQrCode(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="qr-box">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrCode.sku}`} alt="QR Code" />
              </div>
              <div className="detail-row">
                <span className="label">SKU</span>
                <span className="value code">{qrCode.sku}</span>
              </div>
              <div className="detail-row">
                <span className="label">Product</span>
                <span className="value">{qrCode.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Location</span>
                <span className="value">{qrCode.location}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">IC</div>
          <span>InvCare Enterprise</span>
        </div>
        <nav className="nav-menu">
          <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>Inventory Ledger</button>
          <button className={`nav-item ${activeView === 'forecasting' ? 'active' : ''}`} onClick={() => setActiveView('forecasting')}>Demand Forecasting</button>
          <button className={`nav-item ${activeView === 'vendors' ? 'active' : ''}`} onClick={() => setActiveView('vendors')}>Supplier Network</button>
          <button className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => setActiveView('analytics')}>Data Analytics</button>
        </nav>
        <div className="audit-log">
          <h4 className="audit-title">System Audit Log</h4>
          {activities.length === 0 ? <p className="audit-empty">Awaiting events...</p> : (
            <ul className="audit-list">
              {activities.map(act => (
                <li key={act.id}>
                  <span className="audit-time">{act.time}</span>
                  <span className="audit-text">{act.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-area">
        <header className="page-header">
          <div>
            <h1 className="page-title">{
              activeView === 'dashboard' ? 'Inventory Ledger' :
              activeView === 'forecasting' ? 'Demand Forecasting' :
              activeView === 'vendors' ? 'Supplier Network' : 'Data Analytics'
            }</h1>
            <p className="page-subtitle">Real-time warehouse synchronization</p>
          </div>
          {activeView === 'dashboard' && (
            <input 
              type="text" 
              placeholder="Search SKU, name, or location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-search"
            />
          )}
        </header>

        <div className="page-content">
          {activeView === 'dashboard' && (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-label">Active SKUs</span>
                  <span className="kpi-value">{items.length}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Capital Allocation</span>
                  <span className="kpi-value text-primary">{formatINR(totalValue)}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Critical Alerts</span>
                  <span className={`kpi-value ${lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>{lowStockCount}</span>
                </div>
              </div>

              <div className="split-view">
                <div className="card form-section">
                  <h2 className="card-title">Provision Asset</h2>
                  <form onSubmit={handleSubmit} className="data-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Asset Name</label>
                        <input name="name" value={form.name} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="form-row cols-2">
                      <div className="form-group">
                        <label>SKU Number</label>
                        <input name="sku" value={form.sku} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <select name="category" value={form.category} onChange={handleChange}>
                          <option>Raw Materials</option>
                          <option>Finished Goods</option>
                          <option>Machinery Parts</option>
                          <option>Packaging</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row cols-2">
                      <div className="form-group">
                        <label>Warehouse Location</label>
                        <input name="location" value={form.location} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label>Vendor Identifier</label>
                        <input name="supplier" value={form.supplier} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="form-row cols-3">
                      <div className="form-group">
                        <label>Initial Qty</label>
                        <input name="quantity" type="number" value={form.quantity} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label>Reorder Point</label>
                        <input name="reorder_point" type="number" value={form.reorder_point} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label>Unit Price (₹)</label>
                        <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">Save Record</button>
                    </div>
                  </form>
                </div>

                <div className="card table-section">
                  <div className="card-header">
                    <h2 className="card-title">Master Registry</h2>
                    <button onClick={() => window.print()} className="btn btn-secondary">Print Report</button>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th onClick={() => handleSort('sku')} className="sortable">Asset Details {sortConfig.key==='sku' ? (sortConfig.direction==='asc'?'↑':'↓') : ''}</th>
                          <th onClick={() => handleSort('location')} className="sortable">Location {sortConfig.key==='location' ? (sortConfig.direction==='asc'?'↑':'↓') : ''}</th>
                          <th onClick={() => handleSort('quantity')} className="sortable">Stock {sortConfig.key==='quantity' ? (sortConfig.direction==='asc'?'↑':'↓') : ''}</th>
                          <th onClick={() => handleSort('price')} className="sortable">Valuation {sortConfig.key==='price' ? (sortConfig.direction==='asc'?'↑':'↓') : ''}</th>
                          <th className="align-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedItems.map(item => (
                          <tr key={item.id}>
                            <td>
                              <div className="text-strong">{item.name}</div>
                              <div className="text-mono text-xs text-muted">{item.sku}</div>
                            </td>
                            <td className="text-sm">{item.location}</td>
                            <td>
                              <div className="stepper">
                                <button type="button" onClick={() => adjustStock(item, -1)} className="btn-stepper">-</button>
                                <span className={`stepper-val ${item.quantity <= item.reorder_point ? 'text-danger text-strong' : ''}`}>{item.quantity}</span>
                                <button type="button" onClick={() => adjustStock(item, 1)} className="btn-stepper">+</button>
                              </div>
                            </td>
                            <td className="text-sm">{formatINR(item.price * item.quantity)}</td>
                            <td className="align-right">
                              <div className="btn-group">
                                <button onClick={() => setQrCode(item)} className="btn-action">QR</button>
                                <button onClick={() => deleteItem(item.id, item.sku)} className="btn-action text-danger">DEL</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'forecasting' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Runway Projections</h2>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset Identifier</th>
                    <th>Current Volume</th>
                    <th>Burn Rate (Est/Day)</th>
                    <th>Projected Runway</th>
                    <th>System Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastingData.map(item => (
                    <tr key={item.id}>
                      <td><span className="text-strong">{item.name}</span> <span className="text-muted text-xs">({item.sku})</span></td>
                      <td className="text-sm">{item.quantity} units</td>
                      <td className="text-sm">{item.burnRate} units</td>
                      <td>
                        <div className="progress-track">
                          <div className={`progress-fill ${item.daysLeft <= 7 ? 'bg-danger' : item.daysLeft <= 14 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, (item.daysLeft / 30) * 100)}%` }} />
                        </div>
                        <div className="text-xs text-muted mt-1">{item.daysLeft} days remaining</div>
                      </td>
                      <td>
                        {item.daysLeft <= 7 ? <span className="status-pill danger">Reorder Required</span> : <span className="status-pill success">Optimal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'vendors' && (
            <div className="grid-cards">
              {Object.entries(uniqueVendors).map(([vendor, data]) => (
                <div key={vendor} className="card">
                  <h3 className="card-title">{vendor}</h3>
                  <div className="mt-3">
                    <div className="detail-row">
                      <span className="label">Total Exposure</span>
                      <span className="value text-strong">{formatINR(data.totalValue)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Active Lines</span>
                      <span className="value">{data.items.length}</span>
                    </div>
                    <div className="tag-list mt-3">
                      {data.items.slice(0, 4).map(i => <span key={i} className="tag">{i}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="grid-cards">
              {Object.entries(categoryData).map(([category, data]) => (
                <div key={category} className="card">
                  <h3 className="card-title">{category}</h3>
                  <div className="mt-3">
                    <div className="detail-row">
                      <span className="label">Allocation</span>
                      <span className="value text-strong">{formatINR(data.value)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">SKU Count</span>
                      <span className="value">{data.count}</span>
                    </div>
                    <div className="progress-track mt-3">
                      <div className="progress-fill bg-primary" style={{ width: `${(data.value / totalValue) * 100}%` }} />
                    </div>
                    <div className="text-xs text-muted mt-1">{((data.value / totalValue) * 100).toFixed(1)}% of portfolio</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}