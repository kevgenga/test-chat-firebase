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
// const storage = firebase.storage(); // Pour le stockage d'images
const db = firebase.firestore();

// Vérification de l'authentification de l'utilisateur
auth.onAuthStateChanged((user) => {
  if (user) {
    // Affichage des informations du profil
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-uid').textContent = user.uid;
    document.getElementById('user-displayName').textContent = user.displayName || "Non défini";
    
    // Affichage de l'avatar ou image par défaut
    if (user.photoURL) {
      document.getElementById('user-avatar').src = user.photoURL;
    } else {
      document.getElementById('user-avatar').src = "assets/profil.jpg"; // Chemin du fichier par défaut
    }
  } else {
    window.location.href = "index.html"; // Redirige si non connecté
  }
});

// Redirection vers le chat
document.getElementById('go-to-chat').addEventListener('click', () => {
  window.location.href = "chat.html";
});

// // Déconnexion
// document.getElementById('logout-button').addEventListener('click', () => {
//   auth.signOut().then(() => {
//     window.location.href = "index.html";
//   }).catch(error => {
//     console.error("Erreur de déconnexion :", error);
//   });
// });

// Affichage du formulaire d'édition
document.getElementById('edit-profile-button').addEventListener('click', () => {
  document.getElementById('edit-profile-form').style.display = 'block';
});

// Annulation de l'édition
document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('edit-profile-form').style.display = 'none';
});

// Gestion de la mise à jour du profil
document.getElementById('profileForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const newDisplayName = document.getElementById('displayName').value;
  // const avatarFile = document.getElementById('avatar').files[0];
  
  let updates = {};

  if (newDisplayName) {
    updates.displayName = newDisplayName;
  }

  try {
    // Si un fichier avatar est sélectionné, on l'upload sur Firebase Storage
    // if (avatarFile) {
    //   if (!avatarFile.type.startsWith('image/')) {
    //     alert("Veuillez télécharger une image valide.");
    //     return;
    //   }

    //   const storageRef = storage.ref();
    //   const avatarRef = storageRef.child(`avatars/${user.uid}/${avatarFile.name}`);

    //   // Upload de l'image
    //   const snapshot = await avatarRef.put(avatarFile);
    //   // Récupération de l'URL de téléchargement
    //   const downloadURL = await snapshot.ref.getDownloadURL();
    //   updates.photoURL = downloadURL;
    // }

    // Mise à jour du profil dans Firebase Auth
    await user.updateProfile(updates);

    // Mise à jour des éléments affichés
    document.getElementById('user-displayName').textContent = user.displayName;
    if (user.photoURL) {
      document.getElementById('user-avatar').src = user.photoURL;
    }

    document.getElementById('edit-profile-form').style.display = 'none';
    alert("Profil mis à jour !");
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil :", error);
    alert(`Erreur lors de la mise à jour du profil : ${error.message}`);
  }
});
