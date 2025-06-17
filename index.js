require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { Issuer } = require('openid-client');
Issuer.defaultHttpOptions = { timeout: 20000 };
const { auth, requiresAuth } = require('express-openid-connect');

const app = express();
app.use(express.json());

// ✅ Kết nối MongoDB Atlas
mongoose.connect('mongodb+srv://tuanhaohuynh27:1590@cluster0.xscl2up.mongodb.net/sinhvien?retryWrites=true&w=majority')
  .then(() => console.log("✅ App 2 kết nối MongoDB thành công"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// ✅ Mongoose model
const Student = mongoose.model('Student', new mongoose.Schema({
  userId: String,
  mssv: String,
  lop: String,
  nganh: String,
  khoa: String
}));

// Session
app.use(session({
  secret: process.env.AUTH0_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Xác thực Auth0
app.use(auth({
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  authRequired: false,
  auth0Logout: true,
  authorizationParams: {
    audience: process.env.AUTH0_AUDIENCE,
    response_type: 'code'
  }
}));

// ✅ Trang chủ
app.get('/', (req, res) => {
  const isAuth = req.oidc.isAuthenticated();
  const user = req.oidc.user || {};

  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>App 2</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head>
    <body class="bg-light">
      <nav class="navbar navbar-expand-lg navbar-dark bg-success mb-4">
        <div class="container">
          <a class="navbar-brand" href="/">Quản Lý Sinh Viên (App 2)</a>
          <div class="d-flex">
            ${isAuth
              ? `<span class="navbar-text text-light me-3">Xin chào, ${user.name}</span>
                 <a href="/logout" class="btn btn-outline-light">Đăng xuất</a>`
              : `<a href="/login" class="btn btn-outline-light">Đăng nhập</a>`}
          </div>
        </div>
      </nav>

      <div class="container">
        ${isAuth
          ? `<div class="text-center">
               <div class="card shadow-sm mx-auto" style="max-width: 600px;">
                 <div class="card-body">
                   <h3>Chào mừng ${user.name} đến với App 2!</h3>
                   <a href="/profile" class="btn btn-primary m-2">Hồ sơ cá nhân</a>
                   <a href="/bangdiem" class="btn btn-warning m-2">Xem bảng điểm</a>
                 </div>
               </div>
             </div>`
          : `<div class="text-center mt-5">
               <h1>Hệ Thống Quản Lý Sinh Viên (App 2)</h1>
               <p>Vui lòng đăng nhập để sử dụng hệ thống</p>
               <a href="/login" class="btn btn-lg btn-success">Đăng nhập</a>
             </div>`}
      </div>
    </body></html>
  `);
});

// ✅ Hồ sơ cá nhân (có access token)
app.get('/profile', requiresAuth(), async (req, res) => {
  const user = req.oidc.user;
  const idToken = req.oidc.idToken || "Không có ID token";
  const accessToken = req.oidc.accessToken?.access_token || "Không có access token";

  const avatar = user.picture || 'https://via.placeholder.com/100';
  const email = user.email || 'Không có email';
  const name = user.name || 'Không có tên';
  const userId = user.sub || 'Không có ID';

  const student = await Student.findOne({ userId });

  const mssv = student?.mssv || 'Chưa có';
  const lop = student?.lop || 'Không rõ';
  const nganh = student?.nganh || 'Không rõ';
  const khoa = student?.khoa || 'Không rõ';

  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Hồ sơ</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head>
    <body class="bg-light">
      <div class="container mt-5 text-center">
        <img src="${avatar}" alt="avatar" class="rounded-circle shadow" width="120">
        <h2 class="mt-3">${name}</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>MSSV:</strong> ${mssv}</p>
        <p><strong>Lớp:</strong> ${lop}</p>
        <p><strong>Ngành:</strong> ${nganh}</p>
        <p><strong>Khoá:</strong> ${khoa}</p>

        <h4 class="mt-4">ID Token</h4>
        <div class="card"><div class="card-body">
          <pre style="white-space: break-spaces;">${idToken}</pre>
        </div></div>

        <h4 class="mt-4">Access Token</h4>
        <div class="card"><div class="card-body">
          <pre style="white-space: break-spaces;">${accessToken}</pre>
        </div></div>

        <a href="/" class="btn btn-secondary mt-3">⬅️ Quay lại</a>
      </div>
    </body></html>
  `);
});

// ✅ Bảng điểm
app.get('/bangdiem', requiresAuth(), (req, res) => {
  const fakeScores = [
    { mon: "Lập trình C", diem: 8.0 },
    { mon: "Mạng Máy Tính", diem: 8.7 },
    { mon: "Hệ điều hành", diem: 7.5 },
    { mon: "Thiết kế Web", diem: 9.0 },
    { mon: "Bảo mật Web", diem: 9.2 }
  ];

  const rows = fakeScores.map(score => `
    <tr><td>${score.mon}</td><td>${score.diem}</td></tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Bảng điểm App 2</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head>
    <body class="bg-light">
      <div class="container mt-5">
        <h2>Bảng điểm cá nhân</h2>
        <table class="table table-bordered">
          <thead><tr><th>Môn học</th><th>Điểm</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <a href="/" class="btn btn-secondary">⬅️ Quay lại</a>
      </div>
    </body></html>
  `);
});

// ✅ Logout
app.get('/logout', (req, res) => {
  const returnTo = encodeURIComponent(process.env.AUTH0_BASE_URL);
  const logoutURL = `https://${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${returnTo}&federated`;
  res.redirect(logoutURL);
});

// ✅ Start Server
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 App chạy tại http://localhost:${PORT}`));
