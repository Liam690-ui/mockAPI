const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');

const usersPath = path.join(__dirname, '..', 'users.json');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.name = userData.name;
    this.email = userData.email;
    this.role = userData.role || 'user';
    this.password = userData.password;
    this.createdAt = userData.createdAt || Date.now();
    this.active = userData.active !== undefined ? userData.active : true;
    this.refreshToken = userData.refreshToken || null;
  }

  static loadAll() {
    if (!fs.existsSync(usersPath)) return [];
    return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  }

  static saveAll(users) {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  }

  static findByEmail(email) {
    return this.loadAll().find(u => u.email === email);
  }

  static async create({ name, email, password, passwordConfirm, role }) {
    if (!name || !email || !password || !passwordConfirm)
      throw new Error('All fields required');
    if (!validator.isEmail(email)) throw new Error('Invalid email');
    if (password !== passwordConfirm) throw new Error('Passwords do not match');

    const users = this.loadAll();
    if (users.find(u => u.email === email)) throw new Error('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      role: role || 'user',
      password: hashedPassword,
      createdAt: Date.now(),
      active: true,
      refreshToken: null,
    };

    users.push(newUser);
    this.saveAll(users);
    return new User(newUser);
  }

  async correctPassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  save() {
    const users = User.loadAll();
    const index = users.findIndex(u => u.id === this.id);
    if (index !== -1) users[index] = { ...users[index], ...this };
    else users.push(this);
    User.saveAll(users);
  }
}

module.exports = User;
