require('dotenv').config();
const express = require('express');
const jsonServer = require('json-server');
const cookieParser = require('cookie-parser');
const cors = require('cors'); // import CORS
const { signup, login, refreshToken, logout } = require('./controllers/authController');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/AppError');

const app = express();

// JSON-server router for mock data
const router = jsonServer.router('./data.json');
const middlewares = jsonServer.defaults({ bodyParser: false });

// --- CORS setup ---
const corsOptions = {
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'], // allowed origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // allowed headers
  credentials: true, // allow cookies
};
app.use(cors(corsOptions));

// --- Middleware ---
app.use(cookieParser());
app.use(middlewares);

// --- Base API prefix ---
const api_prefix = '/api/v1';

// --- Auth routes ---
app.use(`${api_prefix}/auth`, express.json());

app.post(`${api_prefix}/auth/signup`, signup);
app.post(`${api_prefix}/auth/login`, login);
app.post(`${api_prefix}/auth/refresh`, refreshToken);
app.post(`${api_prefix}/auth/logout`, logout);

// --- JSON-server routes (public) ---
app.use(api_prefix, router);

// --- 404 handler ---
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

// --- Global error handler ---
app.use(globalErrorHandler);

// --- Start server ---
const port = process.env.PORT || 7500;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
