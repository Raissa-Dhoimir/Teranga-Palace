// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    checkSession();

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

function toggleAuthMode(event) {
    event.preventDefault();
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const subtitle = document.getElementById('auth-subtitle');
    const alertBox = document.getElementById('alert-container');

    if (alertBox) alertBox.classList.add('hidden');

    if (loginForm.classList.contains('hidden-form')) {
        loginForm.classList.remove('hidden-form');
        registerForm.classList.add('hidden-form');
        subtitle.textContent = "Connectez-vous à votre compte";
    } else {
        loginForm.classList.add('hidden-form');
        registerForm.classList.remove('hidden-form');
        subtitle.textContent = "Créez votre compte";
    }
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert-container');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.classList.remove('hidden');
    } else {
        alert(message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Connexion...";
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        showAlert("Connexion réussie ! Redirection...", "success");
        setTimeout(() => {
            window.location.href = "index.html"; // Rediriger vers l'accueil ou dashboard
        }, 1000);

    } catch (error) {
        showAlert(error.message || "Erreur lors de la connexion.");
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nom = document.getElementById('reg-nom').value;
    const prenom = document.getElementById('reg-prenom').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const adminCode = document.getElementById('reg-admin-code') ? document.getElementById('reg-admin-code').value : '';
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    btn.textContent = "Création...";
    btn.disabled = true;

    try {
        // Inscription via Supabase Auth — le trigger créera automatiquement le profil
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
               data: {
                   role: role,
                   nom: nom,
                   prenom: prenom,
                   admin_code: adminCode
                }
            }
        });

        if (authError) throw authError;

        showAlert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.", "success");

        // Revenir au formulaire de login
        setTimeout(() => {
            toggleAuthMode(new Event('click'));
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
            btn.textContent = originalText;
            btn.disabled = false;
            const alertBox = document.getElementById('alert-container');
            if (alertBox) alertBox.classList.add('hidden');
        }, 2000);

    } catch (error) {
        showAlert(error.message || "Erreur lors de l'inscription.");
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleLogout(e) {
    if (e) e.preventDefault();
    try {
        await supabaseClient.auth.signOut();
        window.location.reload();
    } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
    }
}

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    const authBtnNav = document.getElementById('auth-btn-nav');
    const logoutBtnNav = document.getElementById('logout-btn-nav');
    const dashboardBtnNav = document.getElementById('dashboard-btn-nav');

    if (session) {
        // Si on est sur la page auth.html et qu'on est déjà connecté
        if (window.location.pathname.endsWith('auth.html')) {
            window.location.href = "index.html";
        }

        // Mettre à jour la navigation de index.html
        if (authBtnNav && logoutBtnNav) {
            authBtnNav.classList.add('hidden');
            logoutBtnNav.classList.remove('hidden');
            if (dashboardBtnNav) dashboardBtnNav.classList.remove('hidden');
        }
    } else {
        if (authBtnNav && logoutBtnNav) {
            authBtnNav.classList.remove('hidden');
            logoutBtnNav.classList.add('hidden');
            if (dashboardBtnNav) dashboardBtnNav.classList.add('hidden');
        }
    }

    // Écouter les changements d'état
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && window.location.pathname.endsWith('auth.html')) {
            window.location.href = 'index.html';
        } else if (event === 'SIGNED_OUT') {
            if (authBtnNav && logoutBtnNav) {
                authBtnNav.classList.remove('hidden');
                logoutBtnNav.classList.add('hidden');
                if (dashboardBtnNav) dashboardBtnNav.classList.add('hidden');
            }
        }
    });
}
