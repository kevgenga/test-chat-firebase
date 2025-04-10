// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBW4xNY_A-_CKjv0grQ9m29R4812uPtEX8",
  authDomain: "chat-ephemere.firebaseapp.com",
  projectId: "chat-ephemere",
  storageBucket: "chat-ephemere.appspot.com",
  messagingSenderId: "343801452611",
  appId: "1:343801452611:web:xxxxxxxxxxxxxx"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); // Authentification Firebase
const db = firebase.firestore();  // Firestore pour stocker les utilisateurs

// Vérifie si l'utilisateur est connecté
auth.onAuthStateChanged(user => {
  if (user) {
    window.location.href = "chat.html";
  }
});

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toggleLink = document.getElementById('toggle-link');
const backLink = document.getElementById('back-link');
const authTitle = document.getElementById('auth-title');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// Affichage du formulaire d'inscription
toggleLink.addEventListener('click', () => {
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
  authTitle.textContent = 'Inscription';
  toggleLink.style.display = 'none';
  backLink.style.display = 'block';
});

// Affichage du formulaire de connexion
backLink.addEventListener('click', () => {
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
  authTitle.textContent = 'Connexion';
  backLink.style.display = 'none';
  toggleLink.style.display = 'block';
});

// Inscription utilisateur
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    // Vérification si l'email est déjà utilisé
    const methods = await auth.fetchSignInMethodsForEmail(email);
    if (methods.length > 0) {
      errorMessage.textContent = "Cet email est déjà utilisé. Veuillez en choisir un autre.";
      successMessage.textContent = '';
    } else {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);

      // Enregistre l'email dans Firestore sans pseudo
      await db.collection("users").doc(userCredential.user.uid).set({
        email: userCredential.user.email
      });

      successMessage.textContent = "Inscription réussie ! Connectez-vous.";
      errorMessage.textContent = '';
      signupForm.reset();
    }
  } catch (error) {
    errorMessage.textContent = error.message;
    successMessage.textContent = '';
  }
});

// Connexion utilisateur
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      successMessage.textContent = 'Bienvenue !';
      errorMessage.textContent = '';
      loginForm.reset();
      window.location.href = "chat.html";
    })
    .catch(error => {
      errorMessage.textContent = error.message;
      successMessage.textContent = '';
    });
});

// Thème clair/sombre auto + manuel
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Initialisation du thème
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  setTheme(savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  setTheme('dark');
} else {
  setTheme('light');
}
