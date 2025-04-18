// CONFIG FIREBASE
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
// Référence à la liste dans le DOM
const onlineUsersList = document.getElementById("online-users-list");

function afficherUtilisateursEnLigne() {
  const db = firebase.firestore();

  db.collection("users")
    .where("isOnline", "==", true)
    .onSnapshot((snapshot) => {
      onlineUsersList.innerHTML = "";

      snapshot.forEach((doc) => {
        const user = doc.data();
        const uid = doc.id;

        const li = document.createElement("li");
        li.classList.add("online");

        // Création de l'élément avatar
        const avatar = document.createElement("div");
        avatar.classList.add("message-avatar");

        // Création du lien vers le profil
        const link = document.createElement("a");
        link.href = `profil.html?uid=${uid}`;
        link.classList.add("user-link");
        link.textContent = user.displayName || "Anonyme";

        // Si admin, on ajoute l’emoji 👑
        if (user.role === "admin") {
          const adminIcon = document.createElement("span");
          adminIcon.textContent = "👑";
          adminIcon.classList.add("admin-icon");
          link.appendChild(adminIcon);
        }

        // Conteneur de l’utilisateur
        const userContainer = document.createElement("div");
        userContainer.style.display = "flex";
        userContainer.style.alignItems = "center";
        userContainer.style.gap = "8px";

        userContainer.appendChild(avatar);
        userContainer.appendChild(link);

        li.appendChild(userContainer);
        onlineUsersList.appendChild(li);
      });
    });
}


auth.onAuthStateChanged(async (user) => {
  if (user) {
    userId = user.uid;
    userName = user.displayName || 'Utilisateur';

    await createUserDocIfNotExists(user);

    if (!user.displayName) {
      setUserName();
    } else {
      initializeChat();
      updateOnlineStatus();
      updateOnlineUsersRealtime();
    }
  } else {
    window.location.href = "index.html";
  }
});

async function createUserDocIfNotExists(user) {
  const userDocRef = db.collection("users").doc(user.uid);
  try {
    const doc = await userDocRef.get();
    if (!doc.exists) {
      await userDocRef.set({
        email: user.email,
        pseudo: user.displayName || 'Utilisateur',
        role: 'user'  // rôle par défaut
      });
      console.log("Document utilisateur créé avec succès.");
    } else {
      console.log("Document utilisateur déjà existant.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération/ajout utilisateur :", error);
  }
}

function setUserName() {
  const newUserName = prompt("Veuillez définir votre pseudo :");
  if (newUserName) {
    userName = newUserName;
    const user = auth.currentUser;
    user.updateProfile({ displayName: userName }).then(() => {
      initializeChat();
      updateOnlineStatus();
      updateOnlineUsersRealtime();
    }).catch((error) => {
      console.error("Erreur lors de la mise à jour du pseudo : ", error);
    });
  }
}

function initializeChat() {
  const messagesList = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('bouton-envoyer');

  messageInput.disabled = false;
  sendButton.disabled = false;

  db.collection("messages").orderBy("createdAt").onSnapshot(snapshot => {
    messagesList.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const li = document.createElement('li');
      li.classList.add(data.from === userId ? 'sent' : 'received');

      const container = document.createElement('div');
      container.className = "message-container";

      const header = document.createElement('div');
      header.className = "message-header";

      const userNameElement = document.createElement('div');
      userNameElement.className = "message-user";

      if (data.from === userId) {
        userNameElement.innerHTML = `<span class="vous-label">(Vous)</span> ${userName}`;
      } else {
        const nameText = data.pseudo || "Utilisateur";
        userNameElement.innerHTML = `${nameText} <a href="public-profil.html?user=${data.from}" class="user-link">Profil</a>`;
      }

      const messageText = document.createElement('div');
      messageText.className = "message-text message-content";
      messageText.innerHTML = linkify(data.content);

      const timestamp = document.createElement('div');
      timestamp.className = "message-timestamp";
      timestamp.textContent = data.createdAt?.seconds
        ? new Date(data.createdAt.seconds * 1000).toLocaleString()
        : "Date inconnue";

      header.appendChild(userNameElement);
      container.appendChild(header);

      li.appendChild(container);
      li.appendChild(messageText);
      li.appendChild(timestamp);
      messagesList.appendChild(li);
    });

    messagesList.scrollTop = messagesList.scrollHeight;
  });
}

function linkify(text) {
  const urlPattern = /(\b(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\S*)?)/gi;
  return text.replace(urlPattern, (url) => {
    let hyperlink = url;
    if (!hyperlink.startsWith("http")) {
      hyperlink = "https://" + hyperlink;
    }
    return `<a href="${hyperlink}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

function sendMessage(e) {
  if (e) e.preventDefault();

  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content || !userId) return;

  const processedMessage = traiterCommandes(content);
  if (!processedMessage) return;

  const userEmail = auth.currentUser.email;

  db.collection("messages").add({
    from: userId,
    email: userEmail,
    pseudo: userName,
    content: processedMessage,
    participants: [userId, userEmail],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = '';
}

document.getElementById('messageForm').addEventListener('submit', sendMessage);

function updateOnlineStatus() {
  const user = auth.currentUser;
  if (!user) return;

  const onlineRef = db.collection("onlineUsers").doc(user.uid);
  onlineRef.set({
    uid: user.uid,
    pseudo: user.displayName || 'Utilisateur',
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  });

  window.addEventListener('beforeunload', () => {
    onlineRef.delete();
  });
}

function updateOnlineUsersRealtime() {
  const onlineUsersList = document.getElementById('online-users-list');

  db.collection("onlineUsers")
    .orderBy("lastSeen", "desc")
    .onSnapshot(snapshot => {
      onlineUsersList.innerHTML = '';

      snapshot.forEach(doc => {
        const user = doc.data();
        const li = document.createElement('li');
        li.classList.add('online');

        db.collection("users").doc(user.uid).get().then(userDoc => {
          const userData = userDoc.data();
          const isAdmin = userData?.role === 'admin';
          li.textContent = (isAdmin ? '👑 ' : '') + (user.pseudo || "Utilisateur");
          onlineUsersList.appendChild(li);
        });
      });
    });
}

function cleanupInactiveUsers() {
  const now = firebase.firestore.Timestamp.now();
  const maxInactiveDuration = 5 * 60 * 1000;

  db.collection("onlineUsers")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const user = doc.data();
        const lastSeen = user.lastSeen.toMillis();
        if (now.toMillis() - lastSeen > maxInactiveDuration) {
          db.collection("onlineUsers").doc(user.uid).delete();
        }
      });
    });
}

setInterval(cleanupInactiveUsers, 60 * 1000);

document.getElementById('logout-button').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  }).catch(error => {
    console.error("Erreur de déconnexion : ", error);
  });
});

// Thème
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');
const bodyClass = document.body.classList;
bodyClass.add(savedTheme || (prefersDark ? 'dark' : 'light'));

// Envoi par Entrée
document.getElementById('messageInput').addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// Commandes
function traiterCommandes(message) {
  const trimmed = message.trim().toLowerCase();

  if (trimmed === "/shrug") return "¯\\_(ツ)_/¯";
  if (trimmed === "/roll") return `🎲 Tu as lancé un dé 6 faces... Résultat : ${Math.floor(Math.random() * 6) + 1}`;
  if (trimmed === "/flip") return `🪙 Tu as lancé une pièce... Résultat : ${Math.random() < 0.5 ? "Pile" : "Face"}`;

  if (trimmed.startsWith("/dice ")) {
    const nombreFaces = parseInt(trimmed.split(" ")[1]);
    if (!isNaN(nombreFaces) && nombreFaces > 1) {
      return `🎲 Tu as lancé un dé ${nombreFaces} faces... Résultat : ${Math.floor(Math.random() * nombreFaces) + 1}`;
    } else {
      return "⚠️ Utilisation : /dice <nombre de faces>";
    }
  }

  return message;
}
