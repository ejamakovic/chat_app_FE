const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

const sessionParser = session({
  secret: 'tajni_kljuc',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: null, httpOnly: true }
});

app.use(sessionParser);
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Dohvati username iz sesije
app.get('/session', (req, res) => {
  if (!req.session.username) {
    req.session.username = `USER_${Date.now()}`;
  }
  res.json({ username: req.session.username });
});

// Dohvati sve korisnike sa Spring backenda
app.get('/users', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8080/users'); // Spring endpoint
    const users = await response.json();
    res.json(users);
  } catch (err) {
    console.error('Greška pri dohvatu korisnika:', err);
    res.status(500).json({ error: 'Ne mogu dohvatiti korisnike' });
  }
});

// Dohvati sve poruke sa Spring backenda
app.get("/globalChat", async (req, res) => {
  try {
    const response = await fetch('http://localhost:8080/messages'); // Spring endpoint
    const messages = await response.json();
    res.json(messages);
  } catch (err) {
    console.error('Greška pri dohvatu poruka:', err);
    res.status(500).json({ error: 'Ne mogu dohvatiti poruke' });
  }
});

// Početna ruta
app.get('/', (req, res) => {
  if (!req.session.username) {
    req.session.username = `USER_${Date.now()}`;
  }
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.listen(3000, () => console.log('FE server radi na portu 3000'));
