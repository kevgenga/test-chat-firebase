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
          console.log("Nom d'utilisateur mis à jour.");
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
  console.log("Chat initialisé.");
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

// Affichage et mise à jour du profil utilisateur
function displayUserProfile() {
  console.log("Affichage du profil...");
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

      // Gérer la mise à jour de la bio
      bioElement.addEventListener('blur', () => {
        const newBio = bioElement.value.trim();
        if (newBio !== userData.bio) { // Si la bio a été modifiée
          console.log("Bio modifiée, mise à jour dans Firestore...");
          userRef.update({
            bio: newBio
          }).then(() => {
            console.log('Bio mise à jour avec succès.');
          }).catch(error => {
            console.error('Erreur lors de la mise à jour de la bio:', error);
          });
        }
      });
    } else {
      console.log("Aucun profil trouvé pour cet utilisateur.");
    }
  }).catch((error) => {
    console.error("Erreur lors de la récupération du profil : ", error);
  });
}

// Déconnexion
document.getElementById('logout-button').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = "index.html"; // Redirection après déconnexion
  });
});

