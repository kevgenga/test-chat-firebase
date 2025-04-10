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
let userName = 'Utilisateur'; // Valeur par défaut

auth.onAuthStateChanged((user) => {
  if (user) {
    userId = user.uid;
    userName = user.displayName || 'Utilisateur'; // Récupérer le pseudo ou utiliser "Utilisateur" par défaut
    
    // Si le pseudo est manquant, on demande à l'utilisateur de le définir
    if (!user.displayName) {
      setUserName();
    } else {
      initializeChat();
    }
  } else {
    window.location.href = "index.html";
  }
});

// Fonction pour demander un pseudo à l'utilisateur
function setUserName() {
  const newUserName = prompt("Veuillez définir votre pseudo :");
  if (newUserName) {
    userName = newUserName;
    const user = auth.currentUser;
    user.updateProfile({
      displayName: userName
    }).then(() => {
      initializeChat();
    }).catch((error) => {
      console.error("Erreur lors de la mise à jour du pseudo : ", error);
    });
  }
}

// Initialisation du chat avec l'affichage des messages
function initializeChat() {
  const messagesList = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('bouton-envoyer');

  // Activation du champ de saisie et du bouton d'envoi
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

        // VERSION AVEC PROFIL > VOUS ou VOUS > PROFIL
        const userNameElement = document.createElement('div');
        userNameElement.className = "message-user";

        // Créer le lien vers le profil
        const userLink = document.createElement('a');
        userLink.href = `public-profil.html?user=${data.from}`;
        userLink.textContent = "Profil";
        userLink.classList.add("user-link");

        // Si c'est l'utilisateur connecté → "Profil > Vous"
        if (data.from === userId) {
          const vousSpan = document.createElement("span");
          vousSpan.textContent = "(Vous) ";
          vousSpan.classList.add("vous-label"); // Classe CSS spéciale pour "Vous"
          userNameElement.appendChild(vousSpan);
          userNameElement.appendChild(document.createTextNode(userName));
        
          // // Ajout du lien vers ton profil de l'utilisateur (PUBLIC PROFIL)
          // userNameElement.appendChild(userLink);
        
        } else {
          // Sinon → "NomUtilisateur > Profil"
          userNameElement.textContent = (data.pseudo || "Utilisateur") + "";
          userNameElement.appendChild(userLink);
        }
        // fin VERSION AVEC PROFIL

        const messageText = document.createElement('div');
        messageText.className = "message-text";
        messageText.textContent = data.content;

        const timestamp = document.createElement('div');
        timestamp.className = "message-timestamp";
        timestamp.textContent = data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000).toLocaleString()
          : "Date inconnue";

        container.appendChild(avatar);
        header.appendChild(userNameElement); // Ajout du nom d'utilisateur
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
function sendMessage() {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content || !userId) return;

  const userEmail = auth.currentUser.email;

  db.collection("messages").add({
    from: userId,
    email: userEmail,
    pseudo: userName,  // Ajout du pseudo dans le message
    content: content,
    participants: [userId, userEmail],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = '';
  console.log("Envoi du message par :", userName);
}

// Déconnexion de l'utilisateur
document.getElementById('logout-button').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  }).catch(error => {
    console.error("Erreur de déconnexion : ", error);
  });
});

// GESTION DU MODE SOMBRE / CLAIR
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

// Envoi du message avec la touche "Entrée"
document.getElementById('messageInput').addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Empêche le saut de ligne
    sendMessage();
  }
});
