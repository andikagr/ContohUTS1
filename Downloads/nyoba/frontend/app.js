// ===== Configuration =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';  // Use relative path when running behind proxy

// ===== State =====
let orderItems = [];
let usersCache = [];
let productsCache = [];

// ===== Tab Switching =====
function switchTab(tab) {
  // Remove active from all tabs and sections
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Activate selected
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`section-${tab}`).classList.add('active');

  // Load data
  if (tab === 'users') loadUsers();
  if (tab === 'products') loadProducts();
  if (tab === 'orders') loadOrders();
}

// ===== Toast Notification =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ===== Form Show/Hide =====
function showForm(type) {
  document.getElementById(`${type}-form`).classList.remove('hidden');
  if (type === 'user') {
    document.getElementById('user-form-title').textContent = 'Tambah User Baru';
    document.getElementById('user-edit-id').value = '';
    clearInputs(['user-name', 'user-email', 'user-phone', 'user-address']);
  }
  if (type === 'product') {
    document.getElementById('product-form-title').textContent = 'Tambah Produk Baru';
    document.getElementById('product-edit-id').value = '';
    clearInputs(['product-name', 'product-category', 'product-price', 'product-stock', 'product-description']);
  }
}

function hideForm(type) {
  document.getElementById(`${type}-form`).classList.add('hidden');
}

function showOrderForm() {
  document.getElementById('order-form').classList.remove('hidden');
  orderItems = [];
  renderOrderItems();
  loadUsersForSelect();
  loadProductsForSelect();
}

function clearInputs(ids) {
  ids.forEach(id => { document.getElementById(id).value = ''; });
}

// ===== Format Helpers =====
function formatRupiah(num) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// ===== USER CRUD =====
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const data = await res.json();
    usersCache = data.data || [];
    renderUsers(usersCache);
  } catch (err) {
    document.getElementById('users-tbody').innerHTML =
      '<tr><td colspan="5" class="empty-state">⚠️ Tidak bisa terhubung ke User Service</td></tr>';
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('users-tbody');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data user. Klik "+ Tambah User" untuk memulai.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>${u.address || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-primary btn-icon" onclick="editUser('${u._id}')" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteUser('${u._id}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function saveUser() {
  const editId = document.getElementById('user-edit-id').value;
  const body = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    phone: document.getElementById('user-phone').value,
    address: document.getElementById('user-address').value
  };

  if (!body.name || !body.email || !body.phone) {
    showToast('Nama, Email, dan Telepon wajib diisi', 'error');
    return;
  }

  try {
    const url = editId ? `${API_BASE}/api/users/${editId}` : `${API_BASE}/api/users`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(editId ? 'User berhasil diupdate!' : 'User berhasil ditambahkan!');
      hideForm('user');
      loadUsers();
    } else {
      showToast(data.message || 'Gagal menyimpan user', 'error');
    }
  } catch (err) {
    showToast('Error koneksi ke server', 'error');
  }
}

async function editUser(id) {
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`);
    const data = await res.json();
    if (data.success) {
      const u = data.data;
      document.getElementById('user-form-title').textContent = 'Edit User';
      document.getElementById('user-edit-id').value = u._id;
      document.getElementById('user-name').value = u.name;
      document.getElementById('user-email').value = u.email;
      document.getElementById('user-phone').value = u.phone;
      document.getElementById('user-address').value = u.address || '';
      document.getElementById('user-form').classList.remove('hidden');
    }
  } catch (err) {
    showToast('Gagal memuat data user', 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Yakin ingin menghapus user ini?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('User berhasil dihapus!');
      loadUsers();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Error koneksi ke server', 'error');
  }
}

// ===== PRODUCT CRUD =====
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();
    productsCache = data.data || [];
    renderProducts(productsCache);
  } catch (err) {
    document.getElementById('products-tbody').innerHTML =
      '<tr><td colspan="5" class="empty-state">⚠️ Tidak bisa terhubung ke Product Service</td></tr>';
  }
}

function renderProducts(products) {
  const tbody = document.getElementById('products-tbody');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data produk. Klik "+ Tambah Produk" untuk memulai.</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '-'}</td>
      <td class="price">${formatRupiah(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-primary btn-icon" onclick="editProduct('${p._id}')" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct('${p._id}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function saveProduct() {
  const editId = document.getElementById('product-edit-id').value;
  const body = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: Number(document.getElementById('product-price').value),
    stock: Number(document.getElementById('product-stock').value),
    category: document.getElementById('product-category').value
  };

  if (!body.name || !body.price) {
    showToast('Nama dan Harga wajib diisi', 'error');
    return;
  }

  try {
    const url = editId ? `${API_BASE}/api/products/${editId}` : `${API_BASE}/api/products`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(editId ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
      hideForm('product');
      loadProducts();
    } else {
      showToast(data.message || 'Gagal menyimpan produk', 'error');
    }
  } catch (err) {
    showToast('Error koneksi ke server', 'error');
  }
}

async function editProduct(id) {
  try {
    const res = await fetch(`${API_BASE}/api/products/${id}`);
    const data = await res.json();
    if (data.success) {
      const p = data.data;
      document.getElementById('product-form-title').textContent = 'Edit Produk';
      document.getElementById('product-edit-id').value = p._id;
      document.getElementById('product-name').value = p.name;
      document.getElementById('product-description').value = p.description || '';
      document.getElementById('product-price').value = p.price;
      document.getElementById('product-stock').value = p.stock;
      document.getElementById('product-category').value = p.category || '';
      document.getElementById('product-form').classList.remove('hidden');
    }
  } catch (err) {
    showToast('Gagal memuat data produk', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Produk berhasil dihapus!');
      loadProducts();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Error koneksi ke server', 'error');
  }
}

// ===== ORDER CRUD =====
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const data = await res.json();
    renderOrders(data.data || []);
  } catch (err) {
    document.getElementById('orders-tbody').innerHTML =
      '<tr><td colspan="6" class="empty-state">⚠️ Tidak bisa terhubung ke Order Service</td></tr>';
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada order. Buat user & produk dulu, lalu klik "+ Buat Order".</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><code style="font-size:0.75rem;color:var(--text-muted)">${o._id.slice(-8)}</code></td>
      <td><strong>${o.userName || 'N/A'}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${o.userEmail || ''}</span></td>
      <td>${o.items.map(i => `${i.productName} x${i.quantity}`).join('<br>')}</td>
      <td class="price">${formatRupiah(o.totalPrice)}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${o._id}', this.value)">
          ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteOrder('${o._id}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Load users/products for order form selects
async function loadUsersForSelect() {
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const data = await res.json();
    const select = document.getElementById('order-user');
    select.innerHTML = '<option value="">-- Pilih User --</option>';
    (data.data || []).forEach(u => {
      select.innerHTML += `<option value="${u._id}">${u.name} (${u.email})</option>`;
    });
  } catch (err) {
    showToast('Gagal memuat daftar user', 'error');
  }
}

async function loadProductsForSelect() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();
    productsCache = data.data || [];
    const select = document.getElementById('order-product');
    select.innerHTML = '<option value="">-- Pilih Produk --</option>';
    productsCache.forEach(p => {
      select.innerHTML += `<option value="${p._id}">${p.name} - ${formatRupiah(p.price)} (stok: ${p.stock})</option>`;
    });
  } catch (err) {
    showToast('Gagal memuat daftar produk', 'error');
  }
}

function addOrderItem() {
  const productId = document.getElementById('order-product').value;
  const quantity = parseInt(document.getElementById('order-quantity').value) || 1;

  if (!productId) {
    showToast('Pilih produk terlebih dahulu', 'error');
    return;
  }

  const product = productsCache.find(p => p._id === productId);
  if (!product) return;

  // Check if already added
  const existing = orderItems.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    orderItems.push({
      productId,
      productName: product.name,
      price: product.price,
      quantity
    });
  }

  renderOrderItems();
  document.getElementById('order-quantity').value = 1;
}

function renderOrderItems() {
  const container = document.getElementById('order-items-list');
  if (orderItems.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = orderItems.map((item, idx) => `
    <div class="order-item-row">
      <span class="item-name">${item.productName}</span>
      <span class="item-qty">x${item.quantity} = ${formatRupiah(item.price * item.quantity)}</span>
      <button class="remove-item" onclick="removeOrderItem(${idx})">✕</button>
    </div>
  `).join('');
}

function removeOrderItem(idx) {
  orderItems.splice(idx, 1);
  renderOrderItems();
}

async function submitOrder() {
  const userId = document.getElementById('order-user').value;
  if (!userId) {
    showToast('Pilih user terlebih dahulu', 'error');
    return;
  }
  if (orderItems.length === 0) {
    showToast('Tambahkan minimal 1 item ke order', 'error');
    return;
  }

  const body = {
    userId,
    items: orderItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
  };

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Order berhasil dibuat! 🎉');
      hideForm('order');
      orderItems = [];
      loadOrders();
    } else {
      showToast(data.message || 'Gagal membuat order', 'error');
    }
  } catch (err) {
    showToast('Error koneksi ke server', 'error');
  }
}

async function updateOrderStatus(id, status) {
  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Status order diubah ke "${status}"`);
    } else {
      showToast(data.message, 'error');
      loadOrders();
    }
  } catch (err) {
    showToast('Gagal mengubah status', 'error');
  }
}

async function deleteOrder(id) {
  if (!confirm('Yakin ingin menghapus order ini?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Order berhasil dihapus!');
      loadOrders();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Error koneksi ke server', 'error');
  }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});
