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
let isAdmin = false;  // Variable pour vérifier si l'utilisateur est admin

auth.onAuthStateChanged((user) => {
  if (user) {
    userId = user.uid;
    userName = user.displayName || 'Utilisateur';
    checkIfAdmin(userId);  // Vérifier si l'utilisateur est un admin
    if (!user.displayName) {
      setUserName();
    } else {
      initializeChat();
      updateOnlineStatus();  // Mettre à jour le statut de l'utilisateur comme "en ligne"
      updateOnlineUsersRealtime();  // Met à jour la liste des utilisateurs en ligne
      displayAdminIcon();  // Afficher l'emoji 👑 si l'utilisateur est admin
    }
  } else {
    window.location.href = "index.html";
  }
});

function checkIfAdmin(userId) {
  // Vérifie si l'utilisateur est un administrateur dans Firestore
  db.collection("users").doc(userId).get().then((doc) => {
    if (doc.exists && doc.data().isAdmin) {
      isAdmin = true;
    } else {
      isAdmin = false;
    }
  });
}

function setUserName() {
  const newUserName = prompt("Veuillez définir votre pseudo :");
  if (newUserName) {
    userName = newUserName;
    const user = auth.currentUser;
    user.updateProfile({
      displayName: userName
    }).then(() => {
      initializeChat();
      updateOnlineStatus();
      updateOnlineUsersRealtime();
      displayAdminIcon();  // Afficher l'emoji 👑 si l'utilisateur est admin
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

  db.collection("messages")
    .orderBy("createdAt")
    .onSnapshot(snapshot => {
      messagesList.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement('li');
        li.classList.add(data.from === userId ? 'sent' : 'received');

        const container = document.createElement('div');
        container.className = "message-container";

        const avatar = document.createElement('div');
        avatar.className = "message-avatar";

        const header = document.createElement('div');
        header.className = "message-header";

        const userNameElement = document.createElement('div');
        userNameElement.className = "message-user";

        const userLink = document.createElement('a');
        userLink.href = `public-profil.html?user=${data.from}`;
        userLink.textContent = "Profil";
        userLink.classList.add("user-link");

        // Ajout de l'emoji 👑 si l'utilisateur est admin
        if (data.isAdmin) {
          const userIcon = document.createElement("span");
          userIcon.textContent = "👑";
          userIcon.classList.add("admin-icon");
          userNameElement.appendChild(userIcon);
        }

        if (data.from === userId) {
          const vousSpan = document.createElement("span");
          vousSpan.textContent = "(Vous) ";
          vousSpan.classList.add("vous-label");
          userNameElement.appendChild(vousSpan);
          userNameElement.appendChild(document.createTextNode(userName));
        } else {
          userNameElement.textContent = (data.pseudo || "Utilisateur") + "";
          userNameElement.appendChild(userLink);
        }

        const messageText = document.createElement('div');
        messageText.className = "message-text message-content";
        messageText.innerHTML = linkify(data.content);

        function linkify(text) {
          const urlPattern = /(\b(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\S*)?)/gi;
          return text.replace(urlPattern, function (url) {
            let hyperlink = url;
            if (!hyperlink.startsWith("http")) {
              hyperlink = "https://" + hyperlink;
            }
            return `<a href="${hyperlink}" target="_blank" rel="noopener noreferrer">${url}</a>`;
          });
        }

        const timestamp = document.createElement('div');
        timestamp.className = "message-timestamp";
        timestamp.textContent = data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000).toLocaleString()
          : "Date inconnue";

        container.appendChild(avatar);
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

// Envoi du message dans Firestore
function sendMessage(e) {
  if (e) e.preventDefault();  // Empêche le rechargement de la page

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
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    isAdmin: isAdmin  // Ajouter si l'utilisateur est admin
  });

  input.value = ''; // Réinitialise le champ de saisie
  console.log("Envoi du message par :", userName);
}

// Remplacer le clic sur le bouton d'envoi par un formulaire
document.getElementById('messageForm').addEventListener('submit', sendMessage);

// Fonction pour mettre à jour le statut en ligne de l'utilisateur
function updateOnlineStatus() {
  const user = auth.currentUser;
  if (!user) return;

  const onlineRef = db.collection("onlineUsers").doc(user.uid);

  onlineRef.set({
    uid: user.uid,
    pseudo: user.displayName || 'Utilisateur',
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Supprimer l'utilisateur quand il quitte la page
  window.addEventListener('beforeunload', () => {
    onlineRef.delete();
  });
}

// Fonction pour afficher les utilisateurs en ligne
function updateOnlineUsersRealtime() {
  const onlineUsersList = document.getElementById('online-users-list');

  db.collection("onlineUsers")
    .orderBy("lastSeen", "desc")  // Trier par dernière activité
    .onSnapshot(snapshot => {
      onlineUsersList.innerHTML = '';  // Vider la liste avant de la mettre à jour

      snapshot.forEach(doc => {
        const user = doc.data();
        const li = document.createElement('li');
        li.classList.add('online');
        li.textContent = user.pseudo || "Utilisateur";  // Afficher le pseudo
        onlineUsersList.appendChild(li);
      });
    });
}

// Nettoyage des utilisateurs inactifs
function cleanupInactiveUsers() {
  const now = firebase.firestore.Timestamp.now();
  const maxInactiveDuration = 5 * 60 * 1000;  // 5 minutes

  db.collection("onlineUsers")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const user = doc.data();
        const lastSeen = user.lastSeen.toMillis();

        if (now - lastSeen > maxInactiveDuration) {
          db.collection("onlineUsers").doc(user.uid).delete();
        }
      });
    });
}

// Appel périodique de nettoyage
setInterval(cleanupInactiveUsers, 60 * 1000);  // Toutes les 60 secondes

// Déconnexion
document.getElementById('logout-button').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  }).catch(error => {
    console.error("Erreur de déconnexion : ", error);
  });
});

// Mode sombre / clair
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');
const bodyClass = document.body.classList;

if (savedTheme) {
  bodyClass.add(savedTheme);
} else {
  bodyClass.add(prefersDark ? 'dark' : 'light');
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  if (bodyClass.contains('dark')) {
    bodyClass.replace('dark', 'light');
    localStorage.setItem('theme', 'light');
  } else {
    bodyClass.replace('light', 'dark');
    localStorage.setItem('theme', 'dark');
  }
});

// Envoi avec touche "Entrée"
document.getElementById('messageInput').addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// Gestion des commandes
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

  return message; // Si aucune commande, on renvoie le message d'origine
}

