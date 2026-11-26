// End-to-end API smoke test. Needs a running server (npm run dev) on a SEEDED
// database with ONLINE_SHOP=true (the test places orders).
// Usage: node scripts/smoke-test.mjs [baseUrl] [adminEmail] [adminPassword]
const BASE = process.argv[2] || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.argv[3] || process.env.ADMIN_EMAIL || 'owner@example.com';
const ADMIN_PASSWORD = process.argv[4] || process.env.ADMIN_PASSWORD;

let pass = 0, fail = 0;
const jars = { customer: '', admin: '' };
function ok(cond, msg, extra = '') {
  if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg, extra); }
}
async function call(jar, path, { method, body } = {}) {
  const res = await fetch(BASE + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', Cookie: jars[jar] },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) jars[jar] = c.split(';')[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const mobile = '9' + String(Date.now()).slice(-9);

console.log('\nLogin with mobile + password');
let r = await call('customer', '/auth/lookup', { body: { mobile } });
ok(r.data?.next === 'register', 'new number asks to register');
r = await call('customer', '/auth/register', { body: { mobile, name: 'Test Customer', email: 'test@example.com', password: 'short' } });
ok(r.status === 400, 'weak password refused');
r = await call('customer', '/auth/register', { body: { mobile, name: 'Test Customer', email: 'test@example.com', password: 'battery123' } });
ok(r.status === 201 && r.data.customer.profileComplete && r.data.customer.hasPassword, 'account created and logged in');
await call('customer', '/auth/logout', { method: 'POST' });
jars.customer = '';
r = await call('customer', '/auth/lookup', { body: { mobile } });
ok(r.data?.next === 'password', 'registered number asks for password');
r = await call('customer', '/auth/register', { body: { mobile, name: 'Someone Else', email: 'x@example.com', password: 'takeover123' } });
ok(r.status === 409, 'cannot re-register an existing account');
r = await call('customer', '/auth/login', { body: { mobile, password: 'wrongpass1' } });
ok(r.status === 401, 'wrong password refused');
r = await call('customer', '/auth/login', { body: { mobile, password: 'battery123' } });
ok(r.status === 200 && r.data.customer.mobile === mobile, 'logged in with password');
r = await call('customer', '/auth/password/forgot', { body: { mobile } });
ok(r.status === 200 && r.data.emailHint, `reset link requested (${r.data?.emailHint})`);

console.log('\nSmart search');
const search = async (q) => (await call('customer', `/search?q=${encodeURIComponent(q)}`)).data;
let s = await search('two wheeler');
ok(s.total > 0 && s.groups.some((g) => g.brand.name === 'Amaron'), `"two wheeler" → ${s.total} batteries`);
s = await search('automotive');
ok(s.total > 0 && s.groups.flatMap((g) => g.products).every((p) => p.vehicleCategory !== 'TWO_WHEELER'), `"automotive" → ${s.total}, no two-wheelers`);
s = await search('Exide');
ok(s.groups.every((g) => g.brand.name === 'Exide'), '"Exide" shows only the Exide group');
s = await search('35Ah');
ok(s.groups.flatMap((g) => g.products).every((p) => p.capacityAh === 35), '"35Ah" only 35Ah');
const buyable = (await search('automotive')).groups.flatMap((g) => g.products).find((p) => p.purchasable && p.stock >= 2);
ok(!!buyable, `a car battery is purchasable: ${buyable?.name}`);

console.log('\nCart and orders');
const bike = (await search('two wheeler')).groups.flatMap((g) => g.products).find((p) => p.purchasable);
const stockBefore = bike.stock;
r = await call('customer', '/cart/items', { method: 'PUT', body: { productId: bike._id, quantity: 2 } });
ok(r.data.count === 2, 'added 2 to cart');
r = await call('customer', '/orders', {
  body: { name: 'Test Customer', vehicleText: 'Honda Activa 6G', registrationNumber: 'KA25X1', fulfilment: 'DELIVERY_INSTALL',
    address: { line1: '1 CBT Road', city: 'Hubballi', pincode: '580028' }, paymentMethod: 'COD' },
});
ok(r.status === 201, 'cart order placed ' + r.data?.orderId, JSON.stringify(r.data));
const cartOrder = r.data.orderId;
r = await call('customer', '/cart');
ok(r.data.count === 0, 'cart cleared after order');
r = await call('customer', `/products/${bike._id}`);
ok(r.data.product.stock === stockBefore - 2, 'stock reduced by 2');
r = await call('customer', '/orders', { body: { name: 'Test Customer', vehicleText: 'Maruti Swift', fulfilment: 'STORE_PICKUP', paymentMethod: 'PAY_AT_STORE', buyNow: { productId: buyable._id, quantity: 1 } } });
ok(r.status === 201, 'buy-now order placed ' + r.data?.orderId);
r = await call('customer', '/orders', { body: { name: 'Tester', fulfilment: 'STORE_PICKUP', paymentMethod: 'PAY_AT_STORE', buyNow: { productId: buyable._id, quantity: 20 } } });
ok(r.status === 409, 'over-stock order refused');
r = await call('customer', '/me/purchases');
const pur = r.data.purchases.find((p) => p.orderId === cartOrder);
ok(pur && pur.warrantyMonths === bike.warranty.totalMonths && pur.warrantyExpiry, `purchase history has warranty (${pur?.warrantyMonths} months, until ${pur?.warrantyExpiry?.slice(0, 10)})`);

console.log('\nEnquiry');
r = await call('customer', '/enquiries', { body: { name: 'Test Customer', mobile, email: 'test@example.com', orderId: cartOrder, productId: bike._id, enquiryType: 'Warranty', message: 'Battery drains overnight.' } });
ok(r.status === 201 && r.data.message === 'Your enquiry has been submitted successfully.', 'enquiry submitted ' + r.data?.enquiryNumber);
const enqNo = r.data.enquiryNumber;

if (!ADMIN_PASSWORD) {
  console.log('\n(Set ADMIN_PASSWORD to also test the admin console.)');
} else {
  console.log('\nAdmin');
  r = await call('admin', '/admin/stats');
  ok(r.status === 401, 'admin API blocked without login');
  r = await call('admin', '/admin/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  ok(r.status === 200, 'admin logged in');
  r = await call('admin', '/admin/stats');
  ok(r.data.totalOrders >= 2 && r.data.todaySales > 0, `stats: ${r.data.totalOrders} orders, today ₹${r.data.todaySales}`);
  r = await call('admin', `/admin/customers?q=${mobile.slice(-6)}`);
  ok(r.data.customers.length === 1, 'customer found by mobile');
  const cid = r.data.customers[0]._id;
  r = await call('admin', `/admin/customers?q=Test%20Customer`);
  ok(r.data.customers.some((c) => c._id === cid), 'customer found by name');
  r = await call('admin', `/admin/customers/${cid}`);
  ok(r.data.orders.length === 2 && r.data.purchases.length === 2 && r.data.enquiries.length === 1, 'profile has orders, purchases, enquiries');
  r = await call('admin', `/admin/orders/${cartOrder}/status`, { method: 'PATCH', body: { status: 'CONFIRMED', note: 'Called customer' } });
  ok(r.data.order.status === 'CONFIRMED', 'order confirmed');
  r = await call('admin', `/admin/orders/${cartOrder}/status`, { method: 'PATCH', body: { status: 'CANCELLED' } });
  ok(r.data.order.status === 'CANCELLED' && r.data.order.purchases.every((p) => p.status === 'VOID'), 'order cancelled, warranty voided');
  r = await call('customer', `/products/${bike._id}`);
  ok(r.data.product.stock === stockBefore, 'stock returned on cancel');
  r = await call('admin', `/admin/products/${bike._id}/price`, { method: 'PATCH', body: { mrp: bike.mrp, sellingPrice: bike.sellingPrice - 10 } });
  ok(r.data.product.sellingPrice === bike.sellingPrice - 10, 'price updated');
  await call('admin', `/admin/products/${bike._id}/price`, { method: 'PATCH', body: { mrp: bike.mrp, sellingPrice: bike.sellingPrice } });
  r = await call('admin', `/admin/products/${bike._id}/images`, { body: { url: 'https://example.com/battery.png' } });
  const img = r.data.product.images.at(-1);
  ok(img?.url === 'https://example.com/battery.png', 'image added by URL');
  r = await call('admin', `/admin/products/${bike._id}/images`, { body: { url: 'https://example.com/battery-2.png' } });
  const img2 = r.data.product.images.at(-1);
  r = await call('admin', `/admin/products/${bike._id}/images/${img2._id}/primary`, { method: 'PATCH' });
  ok(r.data.product.images[0]._id === img2._id, 'second image made primary');
  await call('admin', `/admin/products/${bike._id}/images/${img2._id}`, { method: 'DELETE' });
  r = await call('admin', `/admin/products/${bike._id}/images/${img._id}`, { method: 'DELETE' });
  ok(!r.data.product.images.some((i) => i._id === img._id), 'image deleted');
  r = await call('admin', '/admin/enquiries?status=New');
  const enq = r.data.enquiries.find((e) => e.enquiryNumber === enqNo);
  ok(!!enq, 'enquiry listed as New (email: ' + enq?.emailStatus + ')');
  r = await call('admin', `/admin/enquiries/${enq._id}`, { method: 'PATCH', body: { status: 'In Progress', note: 'Asked customer to bring battery' } });
  ok(r.data.enquiry.status === 'In Progress' && r.data.enquiry.notes.length === 1, 'enquiry moved to In Progress');
  r = await call('admin', '/admin/brands', { body: { name: 'Test Brand ' + Date.now().toString().slice(-4) } });
  ok(r.status === 201, 'brand added');
  await call('admin', `/admin/brands/${r.data.brand._id}`, { method: 'DELETE' });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
