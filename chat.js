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
  console.log("Envoi du message par :", userName);
}

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
  if (trimmed.startsWith("/dice "));
   
  
  {
    const nombreFaces = parseInt(trimmed.split(" ")[1]);
    if (!isNaN(nombreFaces) && nombreFaces > 1) {
      return `🎲 Tu as lancé un dé ${nombreFaces} faces... Résultat : ${Math.floor(Math.random() * nombreFaces) + 1}`;
    } else {
      return "⚠️ Utilise la commande comme ceci : /dice 20";
    }
  }
  if (trimmed === "/joke") {
    const blagues = [
      "Pourquoi les canards ont-ils autant de plumes ? Pour couvrir leur derrière.",
      "Un SQL entre dans un bar, va jusqu'à deux tables et leur demande : 'Puis-je vous joindre ?'",
      "Pourquoi JavaScript déteste Noël ? Parce qu’il n’aime pas les closures.",
      "Que dit une variable à une autre ? Tu as changé, mec."
    ];
    return `😂 ${blagues[Math.floor(Math.random() * blagues.length)]}`;
  }
  if (trimmed.startsWith("/say ")) return message.slice(5);
  if (trimmed === "/help") {
    return `📜 Commandes disponibles :
/shrug → ¯\\_(ツ)_/¯
/roll → Lancer un dé 6 faces
/flip → Pile ou face
/dice [n] → Lancer un dé à n faces
/joke → Blague aléatoire
/say [texte] → Répète ton texte
/help → Affiche cette liste`;
  }

  return message; // Message classique
}

// Clic bouton envoyer
document.getElementById('bouton-envoyer').addEventListener('click', sendMessage);
s
const accordions = document.querySelectorAll('.accordion');

accordions.forEach(acc => {
  acc.addEventListener('click', function () {
    this.classList.toggle('active');
    const panel = this.nextElementSibling;

    if (panel.style.display === "block") {
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
    }
  });
});

