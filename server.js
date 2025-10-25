const express = require('express');
const path = require('path');
const session = require('express-session');
const { ok } = require('assert');

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
    const response = await fetch('http://localhost:8080/users/connected');
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
app.get('/', async (req, res) => {
  if (!req.session.username) {
    req.session.username = `USER_${Date.now()}`;
    try {
      const response = await fetch('http://localhost:8080/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({username: req.session.username})
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Backend error' });
      }
    }
    catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Greška prilikom dodavanja korisnika' });
    }
  } 
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.post('/sendMessage', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8080/messages/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Backend error' });
    }
    
    return res.status(200).json({ message: 'Poruka uspješno poslana' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška prilikom slanja poruke' });
  }
});



app.listen(3000, () => console.log('FE server radi na portu 3000'));
