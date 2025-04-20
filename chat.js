// Initialisation Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBW4xNY_A-_CKjv0grQ9m29R4812uPtEX8",
  authDomain: "chat-ephemere.firebaseapp.com",
  projectId: "chat-ephemere",
  storageBucket: "chat-ephemere.appspot.com",
  messagingSenderId: "343801452611",
  appId: "1:343801452611:web:xxxxxxxxxxxxxx"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let userId = null;
let userName = 'Utilisateur';
let renderedMessages = new Set();

// Auth utilisateur
auth.onAuthStateChanged((user) => {
  if (user) {
    userId = user.uid;
    userName = user.displayName || 'Utilisateur';
    if (!user.displayName) {
      const pseudo = prompt("Choisis un pseudo :");
      if (pseudo) {
        userName = pseudo;
        user.updateProfile({ displayName: pseudo }).then(() => {
          initializeChat();
        });
      }
    } else {
      initializeChat();
    }
  } else {
    window.location.href = "index.html";
  }
});

function initializeChat() {
  updateOnlineStatus();
  updateOnlineUsersRealtime();
  listenMessages();
  setTheme();
  displayUserProfile(); // Appeler la fonction pour afficher le profil
}

// Affichage des messages
function listenMessages() {
  const messagesList = document.getElementById('messages');

  db.collection("messages").orderBy("createdAt").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const doc = change.doc;
        const data = doc.data();

        if (renderedMessages.has(doc.id)) return;
        renderedMessages.add(doc.id);

        const li = document.createElement('li');
        li.classList.add(data.from === userId ? 'sent' : 'received');

        const container = document.createElement('div');
        container.className = "message-container";

        const header = document.createElement('div');
        header.className = "message-header";

        const userNameEl = document.createElement('span');
        userNameEl.className = "message-user";

        const link = document.createElement('a');
        link.href = `public-profil.html?user=${data.from}`;
        link.textContent = data.pseudo || 'Utilisateur';
        link.classList.add("user-link");

        const roleDoc = await db.collection("users").doc(data.from).get();
        const isAdmin = roleDoc.exists && roleDoc.data().role === 'admin';

        if (data.from === userId) {
          userNameEl.textContent = `(Vous) ${userName}`;
          if (isAdmin) userNameEl.textContent += " 👑";
        } else {
          userNameEl.appendChild(link);
          if (isAdmin) {
            const crown = document.createElement('span');
            crown.textContent = ' 👑';
            userNameEl.appendChild(crown);
          }
        }

        const messageText = document.createElement('div');
        messageText.className = "message-text message-content";
        messageText.innerHTML = linkify(data.content);

        const timestamp = document.createElement('div');
        timestamp.className = "message-timestamp";
        timestamp.textContent = data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString()
          : "Date inconnue";

        header.appendChild(userNameEl);
        container.appendChild(header);

        li.appendChild(container);
        li.appendChild(messageText);
        li.appendChild(timestamp);
        messagesList.appendChild(li);

        // Scroll en bas automatiquement
        messagesList.scrollTop = messagesList.scrollHeight;
      }
    });
  });
}

// Fonction linkify
function linkify(text) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlPattern, url => {
    const href = url.startsWith('http') ? url : 'https://' + url;
    return `<a href="${href}" target="_blank">${url}</a>`;
  });
}

// Envoi de message
document.getElementById('messageForm').addEventListener('submit', sendMessage);
function sendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content) return;

  const processed = traiterCommandes(content);
  db.collection("messages").add({
    from: userId,
    pseudo: userName,
    content: processed,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = '';
}

// Commandes
function traiterCommandes(message) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "/shrug") return "¯\\_(ツ)_/¯";
  if (lower === "/flip") return `🪙 Résultat : ${Math.random() < 0.5 ? "Pile" : "Face"}`;
  if (lower === "/roll") return `🎲 Résultat : ${Math.floor(Math.random() * 6) + 1}`;
  if (lower.startsWith("/dice ")) {
    const faces = parseInt(lower.split(" ")[1]);
    if (faces > 1) return `🎲 Résultat : ${Math.floor(Math.random() * faces) + 1}`;
    return "⚠️ Utilisation : /dice <nombre>";
  }
  return message;
}

// Envoi avec Entrée
document.getElementById('messageInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(e);
  }
});

// Statut en ligne
function updateOnlineStatus() {
  const ref = db.collection("onlineUsers").doc(userId);
  ref.set({
    uid: userId,
    pseudo: userName,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  });

  window.addEventListener('beforeunload', () => {
    ref.delete(); // On retire l'utilisateur de la liste en ligne lorsqu'il quitte la page
  });
}

// Liste utilisateurs en ligne
function updateOnlineUsersRealtime() {
  const list = document.getElementById('online-users-list');
  db.collection("onlineUsers").orderBy("lastSeen", "desc").onSnapshot(snapshot => {
    list.innerHTML = '';
    snapshot.forEach(doc => {
      const user = doc.data();
      const li = document.createElement('li');
      li.className = "online";
      li.textContent = user.pseudo || "Utilisateur";
      list.appendChild(li);
    });
  });
}

// Nettoyage des utilisateurs inactifs
setInterval(() => {
  const now = Date.now();
  db.collection("onlineUsers").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (now - data.lastSeen.toMillis() > 5 * 60 * 1000) { // Si l'utilisateur est inactif depuis plus de 5 minutes
        db.collection("onlineUsers").doc(data.uid).delete(); // On le retire de la liste des utilisateurs en ligne
      }
    });
  });
}, 60 * 1000);

// Thème clair/sombre
function setTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('theme');
  const body = document.body.classList;
  if (saved) {
    body.add(saved);
  } else {
    body.add(prefersDark ? 'dark' : 'light');
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    if (body.contains('dark')) {
      body.replace('dark', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      body.replace('light', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  });
}

// Affichage et mise à jour du profil utilisateur
function displayUserProfile() {
  const userRef = db.collection('users').doc(userId); // Utiliser l'ID utilisateur pour récupérer ses données
  userRef.get().then(doc => {
    if (doc.exists) {
      const userData = doc.data();
      const userNameElement = document.getElementById('user-name');
      const bioElement = document.getElementById('bio');

      // Afficher le nom de l'utilisateur
      userNameElement.textContent = userData.pseudo || "Utilisateur";

      // Afficher la bio si elle existe
      bioElement.value = userData.bio || "";
        }
      });
    }
  });
}

// Déconnexion
document.getElementById('logout-button').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = "index.html"; // Redirection après déconnexion
  });
});
