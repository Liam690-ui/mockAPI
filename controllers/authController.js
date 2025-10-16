
require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');
const { catchAsync } = require('../utils/catchAsync');

const signToken = (id, type = 'access') => {
  const secret = type === 'access'
    ? process.env.ACCESS_TOKEN_SECRET || 'ACCESS_SECRET_KEY'
    : process.env.REFRESH_TOKEN_SECRET || 'REFRESH_SECRET_KEY';
  const expiresIn = type === 'access' ? '5m' : '1d';
  return jwt.sign({ id }, secret, { expiresIn });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const { password, ...withoutPassword } = newUser;
  res.status(201).json({ status: 'success', data: { ...withoutPassword } });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('Email and password required', 400));

  const foundUser = User.findByEmail(email);
  if (!foundUser) return next(new AppError('No user with that email', 404));

  const user = new User(foundUser);
  if (!(await user.correctPassword(password))) 
    return next(new AppError('Incorrect email or password', 401));

  const accessToken = signToken(user.id, 'access');
  const refreshToken = signToken(user.id, 'refresh');

  user.refreshToken = refreshToken;
  user.save();

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    status: 'success',
    data: { accessToken,  message: `Welcome back, ${user.name}` },
  });
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.jwt;
  if (!refreshToken) return next(new AppError('No refresh token', 401));

  const users = User.loadAll();
  const foundUser = users.find(u => u.refreshToken === refreshToken);
  if (!foundUser) return next(new AppError('Invalid refresh token', 403));

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err || foundUser.id !== decoded.id)
      return next(new AppError('Token verification failed', 403));

    const accessToken = signToken(foundUser.id, 'access');
    res.status(200).json({ status: 'success', data: { accessToken } });
  });
});

exports.logout = (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};
