// Global State
let currentPage = 'home';
let foodItems = [];
let cart = [];

// DOM Elements
const appContent = document.getElementById('appContent');
const navSignInBtn = document.getElementById('navSignInBtn');
const userMenuToggle = document.getElementById('userMenuToggle');
const navUserName = document.getElementById('navUserName');
const menuLogout = document.getElementById('menuLogout');

// Templates
const tplHome = document.getElementById('tpl-home');
const tplAuth = document.getElementById('tpl-auth');

// Initialize App
function init() {
    setupNavigation();
    checkAuth();
    loadPage('home');

    // Auth & Generic listeners
    navSignInBtn.addEventListener('click', () => loadPage('auth'));
    document.getElementById('cartBtn').addEventListener('click', () => loadPage('cart'));
    document.getElementById('menuOrders').addEventListener('click', (e) => {
        e.preventDefault();
        loadPage('customer-orders');
    });
    menuLogout.addEventListener('click', (e) => {
        e.preventDefault();
        api.clearAuth();
        checkAuth();
        loadPage('home');
        showToast('Logged out successfully', 'success');
    });

    document.getElementById('menuDashboard').addEventListener('click', (e) => {
        e.preventDefault();
        const user = api.getUser();
        if (user && user.role === 'owner') loadPage('owner-dashboard');
        else if (user && user.role === 'delivery') loadPage('delivery-dashboard');
        else loadPage('home'); // Customer might just see home or profile
    });
}

function checkAuth() {
    const user = api.getUser();
    if (user) {
        navSignInBtn.style.display = 'none';
        userMenuToggle.style.display = 'block';
        navUserName.textContent = user.name.split(' ')[0];
        // setup role specific nav
        if (user.role === 'customer') {
            document.getElementById('cartBtn').style.display = 'inline-block';
            document.getElementById('menuOrders').style.display = 'block';
        } else {
            document.getElementById('cartBtn').style.display = 'none';
            document.getElementById('menuOrders').style.display = 'none';
        }
    } else {
        navSignInBtn.style.display = 'inline-block';
        userMenuToggle.style.display = 'none';
        document.getElementById('cartBtn').style.display = 'none';
        cart = [];
        updateCartBtn();
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');
            const page = e.target.dataset.page;
            if (page) loadPage(page);
        });
    });
}

function loadPage(page) {
    currentPage = page;
    appContent.innerHTML = ''; // Clear current

    if (page === 'home') {
        const clone = tplHome.content.cloneNode(true);
        appContent.appendChild(clone);
        loadFoodMenu();
    } else if (page === 'auth') {
        const clone = tplAuth.content.cloneNode(true);
        appContent.appendChild(clone);
        setupAuthForm();
    } else if (page === 'cart') {
        const clone = document.getElementById('tpl-cart').content.cloneNode(true);
        appContent.appendChild(clone);
        renderCartPage();
    } else if (page === 'customer-orders') {
        const clone = document.getElementById('tpl-customer-orders').content.cloneNode(true);
        appContent.appendChild(clone);
        loadCustomerOrders();
    } else if (page === 'owner-dashboard') {
        const clone = document.getElementById('tpl-owner-dashboard').content.cloneNode(true);
        appContent.appendChild(clone);
        setupOwnerDashboard();
    } else if (page === 'delivery-dashboard') {
        const clone = document.getElementById('tpl-delivery-dashboard').content.cloneNode(true);
        appContent.appendChild(clone);
        setupDeliveryDashboard();
    }
}

// Auth Form Logic
let isLoginMode = true;
function setupAuthForm() {
    const form = document.getElementById('authForm');
    const switchBtn = document.getElementById('authSwitchBtn');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const submitBtn = document.getElementById('authSubmitBtn');

    switchBtn.onclick = (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        document.getElementById('nameGroup').style.display = isLoginMode ? 'none' : 'block';
        document.getElementById('roleGroup').style.display = isLoginMode ? 'none' : 'block';
        const rVal = document.getElementById('authRole').value;
        document.getElementById('phoneGroup').style.display = (!isLoginMode && rVal === 'delivery') ? 'block' : 'none';
        document.getElementById('addressGroup').style.display = (!isLoginMode && rVal === 'customer') ? 'block' : 'none';

        title.textContent = isLoginMode ? 'Sign In' : 'Create Account';
        subtitle.textContent = isLoginMode ? 'Or create an account to start ordering.' : 'Join Foodie today!';
        submitBtn.textContent = isLoginMode ? 'Sign In' : 'Register';

        switchBtn.textContent = isLoginMode ? 'Register' : 'Sign In';
        document.getElementById('authSwitchText').innerHTML = isLoginMode ?
            'Don\'t have an account? ' : 'Already have an account? ';
        document.getElementById('authSwitchText').appendChild(switchBtn);
    };

    document.getElementById('authRole').onchange = (e) => {
        document.getElementById('phoneGroup').style.display = (!isLoginMode && e.target.value === 'delivery') ? 'block' : 'none';
        document.getElementById('addressGroup').style.display = (!isLoginMode && e.target.value === 'customer') ? 'block' : 'none';
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Please wait...';

            if (isLoginMode) {
                const res = await api.request('/auth/login', 'POST', { email, password });
                api.setToken(res.token);
                api.setUser(res.user);
                showToast('Successfully logged in!', 'success');
                checkAuth();

                if (res.user.role === 'owner') loadPage('owner-dashboard');
                else if (res.user.role === 'delivery') loadPage('delivery-dashboard');
                else loadPage('home');

            } else {
                const name = document.getElementById('authName').value;
                const role = document.getElementById('authRole').value;
                const body = { name, email, password, role };
                if (role === 'delivery') body.phone = document.getElementById('authPhone').value;
                if (role === 'customer') body.address = document.getElementById('authAddress').value;

                await api.request('/auth/register', 'POST', body);
                showToast('Registration successful! Please login.', 'success');
                switchBtn.click(); // switch to login
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Sign In' : 'Register';
        }
    };
}

// Food Menu Logic
async function loadFoodMenu() {
    try {
        foodItems = await api.request('/food');
        renderFoodGrid(foodItems);

        // Setup Filters
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                const target = e.target.closest('button');
                target.classList.add('active');

                const filter = target.dataset.filter;
                if (filter === 'all') {
                    renderFoodGrid(foodItems);
                } else {
                    renderFoodGrid(foodItems.filter(i => i.category === filter));
                }
            });
        });
    } catch (err) {
        document.getElementById('foodGrid').innerHTML = '<p class="text-danger">Failed to load menu items.</p>';
    }
}

function renderFoodGrid(items) {
    const grid = document.getElementById('foodGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p>No food items found.</p>';
        return;
    }

    const tpl = document.getElementById('tpl-food-card');
    items.forEach(item => {
        const clone = tpl.content.cloneNode(true);
        const img = clone.querySelector('.food-img');
        img.src = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
        clone.querySelector('.food-title').textContent = item.name;
        clone.querySelector('.food-desc').textContent = item.description || (item.category + ' - ' + item.type);
        clone.querySelector('.food-price').textContent = '₹' + item.price;

        const catIcon = clone.querySelector('.food-cat i');
        if (item.category === 'Veg') {
            catIcon.classList.add('text-success');
        } else {
            catIcon.classList.add('text-danger');
        }

        const addBtn = clone.querySelector('.btn-add');
        addBtn.addEventListener('click', () => addToCart(item));

        grid.appendChild(clone);
    });
}

// Cart Logic
function addToCart(item) {
    const user = api.getUser();
    if (!user || user.role !== 'customer') {
        showToast('Please login as Customer to order', 'error');
        return loadPage('auth');
    }

    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    updateCartBtn();
    showToast(`${item.name} added to cart!`, 'success');
}

function updateCartBtn() {
    const btn = document.getElementById('cartBtn');
    const count = document.getElementById('cartCount');
    if (cart.length > 0) {
        let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        count.textContent = totalItems;
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-outline');
    } else {
        count.textContent = '0';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    }
}

// General Utilities
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- NEW DASHBOARD LOGIC ---

// Cart Page
function renderCartPage() {
    const list = document.getElementById('cartItemsList');
    if (cart.length === 0) {
        list.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('cartTotalPrice').textContent = '0.00';
        document.getElementById('btnPlaceOrder').style.display = 'none';
        return;
    }
    document.getElementById('btnPlaceOrder').style.display = 'inline-block';

    let html = '';
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 10px 0;">
                <div><strong>${item.name}</strong> x ${item.quantity}</div>
                <div>
                    ₹${itemTotal.toFixed(2)}
                    <button class="btn btn-outline" style="padding: 5px 10px; margin-left: 10px;" onclick="removeFromCart(${index})">Remove</button>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
    document.getElementById('cartTotalPrice').textContent = total.toFixed(2);

    document.getElementById('btnPlaceOrder').onclick = async () => {
        try {
            document.getElementById('btnPlaceOrder').disabled = true;
            document.getElementById('btnPlaceOrder').textContent = 'Placing...';
            const itemsPayload = cart.map(i => ({ food_id: i.id, quantity: i.quantity, price: i.price }));
            await api.request('/orders', 'POST', { items: itemsPayload, totalPrice: total });
            showToast('Order placed successfully!', 'success');
            cart = [];
            updateCartBtn();
            loadPage('customer-orders');
        } catch (err) {
            showToast(err.message, 'error');
            document.getElementById('btnPlaceOrder').disabled = false;
        }
    };
}

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    updateCartBtn();
    renderCartPage();
};

// Customer Orders
async function loadCustomerOrders() {
    const list = document.getElementById('customerOrdersList');
    try {
        const orders = await api.request('/orders/myorders');
        if (orders.length === 0) {
            list.innerHTML = '<p>You have no past orders.</p>';
            return;
        }
        let html = '';
        orders.forEach(o => {
            const itemsList = o.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const delInfo = o.delivery_boy ? `<br><small><strong>Delivery Boy:</strong> ${o.delivery_boy.name} (${o.delivery_boy.phone})</small>` : '';
            html += `
                <div class="card" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>Order #${o.id}</strong>
                        <span class="badge" style="background: var(--primary-color); color:white; margin:0; padding: 3px 10px;">${o.status}</span>
                    </div>
                    <p style="margin-top: 10px;"><strong>Items:</strong> ${itemsList}</p>
                    <p><strong>Total:</strong> ₹${o.total_price}</p>
                    ${delInfo}
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = '<p class="text-danger">Failed to load orders.</p>';
    }
}

// Owner Dashboard
function setupOwnerDashboard() {
    // Sidebar logic
    const tabs = document.querySelectorAll('.sidebar-item');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';

            if (tab.dataset.tab === 'owner-menu') loadOwnerMenu();
            if (tab.dataset.tab === 'owner-orders') loadOwnerOrders();
            if (tab.dataset.tab === 'owner-delivery') loadOwnerDeliveryBoys();
            if (tab.dataset.tab === 'owner-requests') loadOwnerRequests();
        });
    });

    document.getElementById('btnShowAddFood').addEventListener('click', () => {
        document.getElementById('addFoodFormCard').style.display = 'block';
    });
    document.getElementById('addFoodForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            name: document.getElementById('afName').value,
            price: document.getElementById('afPrice').value,
            description: document.getElementById('afDesc').value,
            category: document.getElementById('afCat').value,
            type: document.getElementById('afType').value,
            image: document.getElementById('afImage').value
        };
        try {
            await api.request('/food', 'POST', body);
            showToast('Food added successfully');
            document.getElementById('addFoodForm').reset();
            document.getElementById('addFoodFormCard').style.display = 'none';
            loadOwnerMenu();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.getElementById('btnShowAddDel').addEventListener('click', () => {
        document.getElementById('addDelFormCard').style.display = 'block';
    });
    document.getElementById('addDelForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            name: document.getElementById('adName').value,
            email: document.getElementById('adEmail').value,
            password: document.getElementById('adPassword').value,
            phone: document.getElementById('adPhone').value
        };
        try {
            await api.request('/delivery/add', 'POST', body);
            showToast('Delivery boy added');
            document.getElementById('addDelForm').reset();
            document.getElementById('addDelFormCard').style.display = 'none';
            loadOwnerDeliveryBoys();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    loadOwnerMenu();
}

async function loadOwnerMenu() {
    const list = document.getElementById('ownerFoodList');
    try {
        const items = await api.request('/food/owner');
        let html = '';
        items.forEach(i => {
            html += `<tr>
                <td>${i.name}</td>
                <td>${i.category}</td>
                <td>₹${i.price}</td>
                <td><button class="btn btn-outline" style="padding: 5px;" onclick="deleteFood(${i.id})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = '<tr><td colspan="4" class="text-danger">Failed to load</td></tr>';
    }
}

window.deleteFood = async function (id) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
        await api.request(`/food/${id}`, 'DELETE');
        showToast('Item deleted', 'success');
        loadOwnerMenu();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

let allDeliveryBoys = [];
async function loadOwnerDeliveryBoys() {
    const list = document.getElementById('ownerDelList');
    try {
        const boys = await api.request('/delivery');
        allDeliveryBoys = boys;
        let html = '';
        boys.forEach(b => {
            html += `<tr><td>${b.name}</td><td>${b.phone}</td></tr>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = '<tr><td colspan="2" class="text-danger">Failed to load</td></tr>';
    }
}

async function loadOwnerOrders() {
    const div = document.getElementById('ownerOrdersDiv');
    try {
        if (allDeliveryBoys.length === 0) await loadOwnerDeliveryBoys();
        const orders = await api.request('/orders/owner-orders');

        if (orders.length === 0) {
            div.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        let html = '';
        orders.forEach(o => {
            const itemsList = o.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            let actionHtml = '';

            let assignDropdown = `<select id="assign_${o.id}" style="padding:5px; margin-right:10px;"><option value="">Select Delivery Boy</option>`;
            allDeliveryBoys.forEach(d => {
                assignDropdown += `<option value="${d.id}" ${o.delivery_boy_id === d.id ? 'selected' : ''}>${d.name}</option>`;
            });
            assignDropdown += `</select><button class="btn btn-outline" style="padding: 5px 10px;" onclick="assignDelivery(${o.id})">Assign</button>`;

            actionHtml += `
                <div style="margin-top: 15px;">
                    <div><strong>Status:</strong> <span class="badge" style="background:var(--primary-color);color:white;padding:3px 8px;margin:0;">${o.status}</span></div>
                    ${o.status === 'Pending' ? `
                        <div style="margin-top: 10px; display: flex; gap: 10px; align-items:center;">
                            ${assignDropdown}
                        </div>
                    ` : `<p style="margin-top:10px;"><small><strong>Assigned to:</strong> ${o.delivery_boy?.name || 'Unknown'}</small></p>`}
                </div>
            `;

            html += `
                <div class="card" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>Order #${o.id} - Customer: ${o.customer?.name} (${o.customer?.phone || o.customer?.email})</strong>
                        <strong>₹${o.total_price}</strong>
                    </div>
                    <p style="margin-top: 10px;"><strong>Items:</strong> ${itemsList}</p>
                    ${actionHtml}
                </div>
            `;
        });
        div.innerHTML = html;
    } catch (err) {
        div.innerHTML = '<p class="text-danger">Failed to load orders.</p>';
    }
}

window.assignDelivery = async function (orderId) {
    const dId = document.getElementById(`assign_${orderId}`).value;
    if (!dId) return showToast('Please select a delivery boy', 'error');
    try {
        await api.request(`/orders/${orderId}/assign`, 'PUT', { deliveryBoyId: dId });
        showToast('Delivery boy assigned', 'success');
        loadOwnerOrders();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Delivery Dashboard
async function loadDeliveryDashboard() {
    const list = document.getElementById('deliveryOrdersDiv');
    try {
        const orders = await api.request('/delivery/myorders');
        if (orders.length === 0) {
            list.innerHTML = '<p>No assigned orders.</p>';
            return;
        }
        let html = '';
        orders.forEach(o => {
            const itemsList = o.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            html += `
                <div class="card" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items:center;">
                        <strong>Order #${o.id}</strong>
                        <span class="badge" style="background:var(--text-dark);color:white;padding:5px 10px;margin:0;">${o.status}</span>
                    </div>
                    <p style="margin-top: 10px;"><strong>Customer:</strong> ${o.customer?.name} (${o.customer?.email})</p>
                    <p><strong>Items:</strong> ${itemsList}</p>
                    
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <select id="status_${o.id}" style="padding: 8px; border-radius: 5px;">
                            <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="Picked" ${o.status === 'Picked' ? 'selected' : ''}>Picked</option>
                            <option value="Out for Delivery" ${o.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                        <button class="btn btn-primary" onclick="updateDeliveryStatus(${o.id})">Update Status</button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = '<p class="text-danger">Failed to load orders.</p>';
    }
}

window.updateDeliveryStatus = async function (orderId) {
    const status = document.getElementById(`status_${orderId}`).value;
    try {
        await api.request(`/delivery/orders/${orderId}/status`, 'PUT', { status });
        showToast(`Status updated to ${status}`, 'success');
        loadDeliveryDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// JOIN REQUESTS LOGIC
async function loadOwnerRequests() {
    const list = document.getElementById('ownerReqList');
    try {
        const reqs = await api.request('/delivery/requests');
        const badge = document.getElementById('reqBadge');
        if (badge) badge.style.display = reqs.length > 0 ? 'inline-block' : 'none';

        if (reqs.length === 0) {
            list.innerHTML = '<tr><td colspan="3">No pending requests</td></tr>';
            return;
        }
        let html = '';
        reqs.forEach(r => {
            html += `<tr>
                <td>${r.name} (${r.email})</td>
                <td>${r.phone || 'N/A'}</td>
                <td>
                    <button class="btn btn-success" style="padding: 5px 10px;" onclick="acceptRequest(${r.request_id})">Accept</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; margin-left:5px;" onclick="rejectRequest(${r.request_id})">Reject</button>
                </td>
            </tr>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = '<tr><td colspan="3" class="text-danger">Failed to load requests</td></tr>';
    }
}

window.acceptRequest = async function (reqId) {
    try {
        await api.request(`/delivery/requests/${reqId}/accept`, 'POST');
        showToast('Delivery boy accepted!', 'success');
        loadOwnerRequests();
        if (document.querySelector('.sidebar-item[data-tab="owner-delivery"]').classList.contains('active')) {
            loadOwnerDeliveryBoys();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.rejectRequest = async function (reqId) {
    if (!confirm('Are you sure you want to reject this delivery boy?')) return;
    try {
        await api.request(`/delivery/requests/${reqId}/reject`, 'POST');
        showToast('Request rejected', 'success');
        loadOwnerRequests();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

function setupDeliveryDashboard() {
    const tabs = document.querySelectorAll('.sidebar-item');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';

            if (tab.dataset.tab === 'del-orders') loadDeliveryDashboard();
            if (tab.dataset.tab === 'del-join') loadAvailableOwners();
        });
    });
    loadDeliveryDashboard();
    loadAvailableOwners(); // Preload owners to ensure they are visible when switching tab without delay
}

async function loadAvailableOwners() {
    const list = document.getElementById('deliveryOwnersList');
    try {
        const owners = await api.request('/delivery/owners');
        if (owners.length === 0) {
            list.innerHTML = '<tr><td colspan="2">No restaurants available</td></tr>';
            return;
        }
        let html = '';
        owners.forEach(o => {
            html += `<tr>
                <td>${o.name}</td>
                <td><button class="btn btn-primary" onclick="requestToJoin(${o.id})">Request to join</button></td>
            </tr>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = '<tr><td colspan="2" class="text-danger">Failed to load owners</td></tr>';
    }
}

window.requestToJoin = async function (ownerId) {
    try {
        await api.request('/delivery/request', 'POST', { ownerId });
        showToast('Request sent successfully!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Start
document.addEventListener('DOMContentLoaded', init);
