// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBW4xNY_A-_CKjv0grQ9m29R4812uPtEX8",
  authDomain: "chat-ephemere.firebaseapp.com",
  projectId: "chat-ephemere",
  storageBucket: "chat-ephemere.appspot.com",
  messagingSenderId: "343801452611",
  appId: "1:343801452611:web:xxxxxxxxxxxxxx"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const storage = firebase.storage();
const db = firebase.firestore();

// Fonction pour récupérer les paramètres d'URL (comme l'UID)
function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    user: urlParams.get('user')  // Récupère le paramètre "user"
  };
}


// Récupérer le profil de l'utilisateur en fonction de l'UID
async function fetchUserProfile(userId) {
  try {
    // Recherche dans la collection 'messages' pour l'utilisateur
    const querySnapshot = await db.collection('messages')
      .where('from', '==', userId)
      .limit(1)  // On prend un seul message pour récupérer les données de l'utilisateur
      .get();

    if (!querySnapshot.empty) {
      const messageData = querySnapshot.docs[0].data();  // Données du premier message
      const userEmail = messageData.email || "Non défini";  // Email de l'utilisateur
      const userPseudo = messageData.pseudo || "Non défini";  // Pseudo de l'utilisateur
      const userUid = messageData.from;  // UID de l'utilisateur (le champ 'from')

      // Mettre à jour les informations sur la page
      document.getElementById('user-displayName').textContent = userPseudo;
      document.getElementById('user-email').textContent = userEmail;
      document.getElementById('user-uid').textContent = userUid;

      // Affichage de l'avatar de l'utilisateur (si tu as un champ avatar dans Firebase, sinon laisse une valeur par défaut)
      const avatarUrl = 'assets/profil.jpg';  // À ajuster selon les données disponibles
      document.getElementById('user-avatar').src = avatarUrl;
    } else {
      alert("Utilisateur non trouvé");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du profil :", error);
    alert("Erreur lors de la récupération du profil");
  }
}


// Récupérer l'UID depuis les paramètres d'URL et afficher le profil
const { user } = getQueryParams();  // Utilise 'user' et non 'uid'
if (user) {
  fetchUserProfile(user);  // Passer 'user' au lieu de 'uid'
} else {
  alert("Aucun utilisateur spécifié");
}


// Redirection vers le chat
document.getElementById('go-to-chat').addEventListener('click', () => {
window.location.href = "chat.html";
});
