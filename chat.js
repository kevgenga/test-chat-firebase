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

auth.onAuthStateChanged((user) => {
  if (user) {
    userId = user.uid;
    userName = user.displayName || 'Utilisateur';
    if (!user.displayName) {
      setUserName();
    } else {
      initializeChat();
      updateOnlineStatus();  // Mettre à jour le statut de l'utilisateur comme "en ligne"
      updateOnlineUsersRealtime();  // Met à jour la liste des utilisateurs en ligne
    }
  } else {
    window.location.href = "index.html";
  }
});

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
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
// ✅ Bouton de déconnexion
document.getElementById('logout-button').addEventListener('click', () => {
  firebase.auth().signOut().then(() => {
    window.location.href = "index.html"; // Redirection vers la page de connexion
  }).catch(error => {
    console.error("Erreur lors de la déconnexion :", error);
    alert("Erreur lors de la déconnexion.");
  });
});
// Remplacer par un appel Firestore pour récupérer les utilisateurs
const usersRef = db.collection("users");
usersRef.get().then(querySnapshot => {
  querySnapshot.forEach(doc => {
    const user = doc.data();

    // Ici tu peux faire la même logique pour afficher l'utilisateur
    const db = firebase.firestore();

const userRef = db.collection("users").doc("userId");
userRef.get().then((doc) => {
  if (doc.exists) {
    const userData = doc.data();
    const userRole = userData.role;  // Récupérer le rôle depuis Firestore
    displayAdminIcon(userRole);  // Appel à la fonction qui affiche l'emoji
  }
});

  });
});

// On cible l'élément où la liste va s'afficher
const userListContainer = document.getElementById("user-list");

// On parcourt la liste des utilisateurs pour créer et afficher leur carte
users.forEach(user => {
  const userCard = document.createElement("div");
  userCard.className = "user-card";

  // Création de l'élément pour le nom de l'utilisateur
  const username = document.createElement("span");
  username.className = "username";
  username.textContent = user.username;
  
// Supposons que tu as une fonction pour afficher l'emoji admin
function displayAdminIcon(userRole) {
  const userIconElement = document.getElementById('user-icon');

  // Vérifier si l'utilisateur est admin
  if (userRole === 'admin') {
    userIconElement.innerHTML = "👑";  // Emoji d'admin
  } else {
    userIconElement.innerHTML = "";  // Aucun emoji pour les non-admins
  }
}

// Exemple d'appel de la fonction
const userRole = "admin";  // Récupérer cela depuis Firestore ou le backend
displayAdminIcon(userRole);


  // Création de l'élément pour l'email
  const email = document.createElement("div");
  email.className = "user-email";
  email.textContent = user.email;

  // Ajout du nom d'utilisateur et de l'email à la carte de l'utilisateur
  userCard.appendChild(username);
  userCard.appendChild(email);

  // Ajout de la carte utilisateur au conteneur principal
  userListContainer.appendChild(userCard);
});

