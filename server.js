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

app.get('/session', (req, res) => {
  if (!req.session.username) {
    return res.status(400).json({ error: 'Korisnik nije prijavljen' });
  }
  res.json({ username: req.session.username });
});

// Definiši bazni URL za backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

app.get('/users', async (req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/users/connected`);
    const users = await response.json();
    res.json(users);
  } catch (err) {
    console.error('Greška pri dohvatu korisnika:', err);
    res.status(500).json({ error: 'Ne mogu dohvatiti korisnike' });
  }
});

app.get("/globalChat", async (req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/messages/global`);
    const messages = await response.json();
    res.json(messages);
  } catch (err) {
    console.error('Greška pri dohvatu poruka:', err);
    res.status(500).json({ error: 'Ne mogu dohvatiti poruke' });
  }
});

app.get("/privateChat", async (req, res) => {
  try {
    const { sender, receiver } = req.query;
    const response = await fetch(`${BACKEND_URL}/messages/private?sender=${sender}&receiver=${receiver}`);
    const messages = await response.json();
    res.json(messages);
  } catch (err) {
    console.error('Greška pri dohvatu privatnih poruka:', err);
    res.status(500).json({ error: 'Greška prilikom dohvata privatnih poruka' });
  }
});

app.post("/privateChatRequest", async (req, res) => {
  try {
    const { sender, receiver } = req.body; // koristi body umjesto query
    const response = await fetch(`${BACKEND_URL}/messages/private/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, receiver }) // šalje body na backend
    });
    const messages = await response.json();
    res.json(messages);
  } catch (err) {
    console.error('Greška pri slanju zahtjeva za private chat:', err);
    res.status(500).json({ error: 'Greška pri slanju zahtjeva za private chat' });
  }
});

app.get('/', async (req, res) => {
  if (!req.session.username) {
    req.session.username = `USER_${Date.now()}`;

    try {
      const response = await fetch(`${BACKEND_URL}/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: req.session.username })
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Backend error' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Greška prilikom dodavanja korisnika' });
    }
  }
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.post('/sendMessage', async (req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/messages/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Backend error:', text);
      return res.status(response.status).json({ error: text });
    }

    res.status(200).json({ message: 'Poruka uspješno poslana' });
  } catch (err) {
    console.error('Greška prilikom prosljeđivanja poruke:', err);
    res.status(500).json({ error: 'Greška prilikom slanja poruke' });
  }
});

app.post('/logoutUser', async (req, res) => {
  try {
    const username = req.session.username;
    if (!username) return res.sendStatus(400);

    await fetch(`${BACKEND_URL}/users/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    });

    req.session.destroy(err => {
      if (err) console.error(err);
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška prilikom odjave' });
  }
});

app.listen(3000, () => console.log('FE server radi na portu 3000'));
