import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState({});

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  const fetchProducts = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/products/");
    setProducts(res.data);
  };

  const fetchDashboard = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/dashboard/");
    setDashboard(res.data);
  };

  useEffect(() => {
    fetchProducts();
    fetchDashboard();
  }, []);

  const addProduct = async () => {
    await axios.post("http://127.0.0.1:8000/api/products/", {
      name,
      category,
      quantity,
      price,
    });

    setName("");
    setCategory("");
    setQuantity("");
    setPrice("");

    fetchProducts();
    fetchDashboard();
  };

  const deleteProduct = async (id) => {
    await axios.delete(`http://127.0.0.1:8000/api/products/${id}/`);
    fetchProducts();
    fetchDashboard();
  };

  return (
    <div style={{
  fontFamily: "Inter, sans-serif",
  padding: "30px",
  background: "#0f172a",
  color: "white",
  minHeight: "100vh",
  width: "100%"
}}>
      <h1 style={{ 
        textAlign: "center",
        fontWeight: "700",
        letterSpacing: "-1px"
        }}>
      📊 Inventory Dashboard
  </h1>

      {/* DASHBOARD CARDS */}
      <div style={{ display: "flex", gap: "20px", margin: "20px 0" }}>
        <div style={cardStyle}>
          <h3>📦 Total Products</h3>
          <h2>{dashboard.total_products}</h2>
        </div>

        <div style={cardStyle}>
          <h3>💰 Total Value</h3>
          <h2>₹{dashboard.total_value}</h2>
        </div>

        <div style={cardStyle}>
          <h3>⚠️ Low Stock</h3>
          <h2>{dashboard.low_stock}</h2>
        </div>
      </div>

      {/* ADD PRODUCT */}
      <div style={formStyle}>
        <h2>Add Product</h2>

        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
        <input placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />

        <button onClick={addProduct} style={buttonStyle}>Add Product</button>
      </div>

      {/* PRODUCT LIST */}
      <h2>Products</h2>

      {products.map((p) => (
        <div key={p.id} style={productCard}>
          <h3>{p.name}</h3>
          <p>{p.category}</p>
          <p>Qty: {p.quantity}</p>
          <p>₹{p.price}</p>

          <button onClick={() => deleteProduct(p.id)} style={deleteBtn}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

/* STYLES */
const cardStyle = {
  color:"black",
  flex: 1,
  background: "#1e293b",
  color: "white",
  padding: "20px",
  borderRadius: "10px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const formStyle = {
  background: "#1e293b",
  color: "white",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "20px",
};

const inputStyle = {
  display: "block",
  margin: "10px 0",
  padding: "12px",
  width: "100%",
  border: "1px solid #ddd",
  borderRadius: "8px",
  outline: "none",
  background: "#1e293b",
color: "white"
};

const buttonStyle = {
  padding: "12px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  cursor: "pointer",
  borderRadius: "8px",
  fontWeight: "600",
};

const productCard = {
  background: "#1e293b",
  color: "white",
  padding: "15px",
  margin: "10px 0",
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const deleteBtn = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "8px 12px",
  cursor: "pointer",
  borderRadius: "6px",
};

export default App;