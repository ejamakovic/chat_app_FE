const chatWindow = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userList = document.getElementById('userList');
const notification = document.getElementById('notification');
const currentUserDiv = document.getElementById('currentUser');


// --- Modal za privatni chat ---
const userModal = document.createElement('div');
userModal.id = 'userModal';
userModal.className = 'modal hidden';
userModal.innerHTML = `
  <div class="modal-content">
    <h3 id="modalUsername"></h3>
    <div class="modal-actions">
      <button id="startChatBtn">Otvori chat</button>
      <button id="closeModalBtn">Zatvori</button>
    </div>
  </div>
`;
document.body.appendChild(userModal);

const modalUsername = userModal.querySelector('#modalUsername');
const startChatBtn = userModal.querySelector('#startChatBtn');
const closeModalBtn = userModal.querySelector('#closeModalBtn');

// Klik na korisnika otvara modal
userList.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    const selectedUser = e.target.textContent;
    modalUsername.textContent = selectedUser;
    userModal.classList.remove('hidden');

    startChatBtn.onclick = () => {
      loadPrivateChat(selectedUser); // koristi postojeću funkciju
      userModal.classList.add('hidden');
    };
  }
});

// Zatvori modal
closeModalBtn.addEventListener('click', () => {
  userModal.classList.add('hidden');
});

let username;
let activeReceiver = null;
let socket;

// Bazni URL backend-a
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:8080';

async function getCurrentUser() {
  try {
    const res = await fetch('/session');
    const data = await res.json();
    username = data.username;
    currentUserDiv.textContent = `Prijavljen korisnik: ${username}`;
  } catch (err) { console.error(err); }
}

function addUserToList(user) {
  if (user === username) return;
  if ([...userList.children].some(li => li.textContent === user)) return;
  const li = document.createElement('li');
  li.textContent = user;
  li.addEventListener('click', () => loadPrivateChat(user));
  userList.appendChild(li);
}

async function fetchUsers() {
  try {
    const res = await fetch('/users');
    const users = await res.json();
    userList.innerHTML = '';
    users.forEach(u => { if (u.connected) addUserToList(u.username); });
  } catch (err) { console.error(err); }
}

async function fetchGlobalChat() {
  try {
    const res = await fetch('/globalChat');
    const messages = await res.json();
    chatWindow.innerHTML = '';
    messages.forEach(showMessage);
    scrollToLastMessage(true);
  } catch (err) { console.error(err); }
}

function showMessage(msg) {
  const div = document.createElement('div');
  div.classList.add('message');
  const date = new Date(msg.timestamp);
  div.innerHTML = `<strong>${msg.sender.username}</strong> [${date.toLocaleString()}]: ${msg.content}`;
  chatWindow.appendChild(div);
}

function showNotification(text) {
  notification.textContent = text;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 5000);
}

function scrollToLastMessage(instant = false) {
  const lastChild = chatWindow.lastElementChild;
  if (lastChild) lastChild.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
}

async function connect() {
  socket = new WebSocket(`${BACKEND_URL.replace(/^http/, 'ws')}/ws/chat`);

  socket.onopen = () => {
    console.log('Povezan na Spring WebSocket server');
    if (username) {
      socket.send(JSON.stringify({ type: 'init', username }));
    }
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'chat') showMessage(msg);
    else if (msg.type === 'user') {
      addUserToList(msg.user.username);
      showNotification(`${msg.user.username} se pridružio!`);
    } else if (msg.type === 'private') showPrivateMessage(msg);
  };

  socket.onclose = () => console.log('Veza zatvorena');
  socket.onerror = (err) => console.error(err);
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const body = { sender: { username }, receiver: activeReceiver ? { username: activeReceiver } : null, content: text };
  messageInput.value = '';

  try {
    const res = await fetch('/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Greška pri slanju poruke');
    scrollToLastMessage();
  } catch (err) { console.error(err); }
}

// Dohvati privatni chat
async function loadPrivateChat(user) {
  activeReceiver = user;
  try {
    const res = await fetch(`/privateChat?sender=${username}&receiver=${user}`);
    const messages = await res.json();
    chatWindow.innerHTML = '';
    messages.forEach(showMessage);
    scrollToLastMessage(true);
  } catch (err) { console.error(err); }
}

function showPrivateMessage(msg) {
  if (msg.sender.username === activeReceiver || msg.receiver.username === activeReceiver) {
    showMessage(msg);
  }
}

// Event listeneri
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

window.addEventListener('beforeunload', async () => {
  try { await fetch('/logoutUser', { method: 'POST' }); }
  catch (err) { console.error('Ne mogu javiti da je user offline', err); }
});

document.getElementById('globalChatBtn').addEventListener('click', async () => {
  activeReceiver = null;
  await fetchGlobalChat();
});


// Inicijalizacija
(async () => {
  await getCurrentUser();
  await fetchUsers();
  await fetchGlobalChat();
  setInterval(fetchUsers, 60000);
  connect();
})();
