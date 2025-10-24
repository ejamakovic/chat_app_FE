const chatWindow = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userList = document.getElementById('userList');
const notification = document.getElementById('notification');
const currentUserDiv = document.getElementById('currentUser');

let username;
let socket;

// Dohvati username iz sesije FE servera
async function getCurrentUser() {
  try {
    const res = await fetch('/session');
    const data = await res.json();
    username = data.username;
    currentUserDiv.textContent = `Prijavljen korisnik: ${username}`;
  } catch (err) {
    console.error(err);
  }
}

// Dodaj korisnika u listu (bez duplikata)
function addUserToList(user) {
  if (user === username) return;
  if ([...userList.children].some(li => li.textContent === user)) return;
  const li = document.createElement('li');
  li.textContent = user;
  userList.appendChild(li);
}

// Dohvati sve korisnike
async function fetchUsers() {
  try {
    const res = await fetch('/users');
    const users = await res.json();
    userList.innerHTML = '';
    users.forEach(userObj => {
      if (userObj.connected) addUserToList(userObj.username);
    });
  } catch (err) {
    console.error(err);
  }
}

// Dohvati sve poruke
async function fetchGlobalChat() {
  try {
    const res = await fetch('/globalChat');
    const messages = await res.json();
    chatWindow.innerHTML = '';
    messages.forEach(msg => showMessage(msg));
  } catch (err) {
    console.error(err);
  }
}

function showMessage(msg) {
  const div = document.createElement('div');
  div.classList.add('message');
  const date = new Date(msg.timestamp);
  div.innerHTML = `<strong>${msg.sender}</strong> [${date.toLocaleString()}]: ${msg.content}`;
  chatWindow.appendChild(div);    
}


// Notifikacija
function showNotification(text) {
  notification.textContent = text;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 3000);
}

// WebSocket konekcija direktno na Spring
function connect() {
  socket = new WebSocket("ws://localhost:8080/ws/chat");

  socket.onopen = () => console.log('Povezan na Spring WebSocket server');

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'chat') {
      showMessage(msg);
    } else if (msg.type === 'user') {
      addUserToList(msg.username);
      showNotification(`${msg.username} se pridružio!`);
    }
  };

  socket.onclose = () => console.log('Veza zatvorena');
  socket.onerror = (err) => console.error(err);
}

// Slanje poruke
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !socket) return;
  socket.send(JSON.stringify({ type: 'chat', content: text }));
  messageInput.value = '';
}

// Event listeneri
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

// Inicijalizacija
(async () => {
  await getCurrentUser();
  await fetchUsers();
  await fetchGlobalChat();
  setInterval(fetchUsers, 60000);
  connect();
})();
