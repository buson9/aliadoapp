// 🔥 CONFIGURACIÓN DE FIREBASE - CON TUS DATOS REALES
const firebaseConfig = {
    apiKey: "AIzaSyAqG3XUuIxqcx2P4HEQz0gQWHttI-tGnM8",
    authDomain: "aliadoapp-148bc.firebaseapp.com",
    projectId: "aliadoapp-148bc",
    storageBucket: "aliadoapp-148bc.firebasestorage.app",
    messagingSenderId: "208490450037",
    appId: "1:208490450037:web:e4f14a33aae521538a3c3c"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const db = firebase.firestore();
const auth = firebase.auth();

// Estado de la aplicación
let currentUser = null;

// Función para autenticar anónimamente
function initAuth() {
    auth.signInAnonymously()
        .then((userCredential) => {
            currentUser = userCredential.user;
            console.log("✅ Usuario anónimo autenticado:", currentUser.uid);
            mostrarMensaje("✅ Sistema listo - Busca profesionales o regístrate", "success");
        })
        .catch((error) => {
            console.error("❌ Error en autenticación:", error);
            mostrarMensaje("❌ Error de conexión con la base de datos", "error");
        });
}

// Función para mostrar mensajes
function mostrarMensaje(texto, tipo = "info") {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 4000);
}

// Detectar ubicación para sugerir departamento
function sugerirUbicacion() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Coordenadas aproximadas de departamentos de Bolivia
                if (lat > -17 && lat < -16 && lon > -69 && lon < -67) {
                    // La Paz
                    document.getElementById('departamentoInput').value = 'la paz';
                    document.getElementById('regDepartamento').value = 'la paz';
                } else if (lat > -18 && lat < -17 && lon > -64 && lon < -62) {
                    // Santa Cruz
                    document.getElementById('departamentoInput').value = 'santa cruz';
                    document.getElementById('regDepartamento').value = 'santa cruz';
                } else if (lat > -18 && lat < -17 && lon > -67 && lon < -65) {
                    // Cochabamba
                    document.getElementById('departamentoInput').value = 'cochabamba';
                    document.getElementById('regDepartamento').value = 'cochabamba';
                }
            },
            (error) => {
                // Silencio - no mostrar error si no se puede obtener ubicación
                console.log("ℹ️ No se pudo obtener la ubicación, el usuario puede seleccionar manualmente");
            }
        );
    }
}

// Iniciar autenticación cuando carga la página
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    sugerirUbicacion();
});