// js/reservation.js

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier l'authentification : il faut être connecté pour réserver
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        alert("Vous devez être connecté pour effectuer une réservation.");
        window.location.href = "auth.html";
        return;
    }

    const dateArrivee = document.getElementById('date-arrivee');
    const dateDepart = document.getElementById('date-depart');
    const chambreSelect = document.getElementById('chambre-select');
    const form = document.getElementById('reservation-form');

    // Définir la date minimale à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    dateArrivee.min = today;
    
    dateArrivee.addEventListener('change', () => {
        // La date de départ doit être au moins le lendemain de l'arrivée
        if (dateArrivee.value) {
            const nextDay = new Date(dateArrivee.value);
            nextDay.setDate(nextDay.getDate() + 1);
            dateDepart.min = nextDay.toISOString().split('T')[0];
            
            if (dateDepart.value && dateDepart.value <= dateArrivee.value) {
                dateDepart.value = '';
            }
        }
        checkAvailability();
    });

    dateDepart.addEventListener('change', checkAvailability);
    chambreSelect.addEventListener('change', updateSummary);

    form.addEventListener('submit', handleReservation);
    
    // Si on vient de la page chambres avec un ID spécifique
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedRoomId = urlParams.get('room');
    if (preselectedRoomId) {
        chambreSelect.dataset.preselected = preselectedRoomId;
    }
});

let availableRooms = [];

async function checkAvailability() {
    const dateArrivee = document.getElementById('date-arrivee').value;
    const dateDepart = document.getElementById('date-depart').value;
    const chambreSelect = document.getElementById('chambre-select');
    const btnReserver = document.getElementById('btn-reserver');

    if (!dateArrivee || !dateDepart) return;

    chambreSelect.innerHTML = '<option value="">Recherche des disponibilités...</option>';
    chambreSelect.disabled = true;
    btnReserver.disabled = true;

    try {
        // 1. Récupérer toutes les chambres qui ne sont pas hors_service
        const { data: chambres, error: errChambres } = await supabaseClient
            .from('chambres')
            .select('*')
            .neq('statut', 'hors_service');
            
        if (errChambres) throw errChambres;

        // 2. Récupérer les réservations qui chevauchent les dates choisies
        const { data: reservations, error: errResa } = await supabaseClient
            .from('reservations')
            .select('id_chambre')
            .neq('statut', 'annulee')
            .lt('date_arrivee', dateDepart)
            .gt('date_depart', dateArrivee);

        if (errResa) throw errResa;

        const reservedRoomIds = reservations.map(r => r.id_chambre);
        
        // 3. Filtrer les chambres disponibles
        availableRooms = chambres.filter(c => !reservedRoomIds.includes(c.id));

        if (availableRooms.length === 0) {
            chambreSelect.innerHTML = '<option value="">Aucune chambre disponible pour ces dates</option>';
            return;
        }

        chambreSelect.innerHTML = '<option value="">-- Choisissez une chambre --</option>';
        availableRooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `${room.type} - N°${room.numero_chambre} (${room.prix_par_nuit.toLocaleString('fr-FR')} FCFA/nuit)`;
            chambreSelect.appendChild(option);
        });

        chambreSelect.disabled = false;
        
        // Pré-sélection si on vient de la page chambres
        const preselected = chambreSelect.dataset.preselected;
        if (preselected && availableRooms.find(r => r.id === preselected)) {
            chambreSelect.value = preselected;
            delete chambreSelect.dataset.preselected;
            updateSummary();
        }

    } catch (error) {
        console.error("Erreur disponibilité:", error);
        showAlert("Erreur lors de la recherche des disponibilités.", "error");
    }
}

function updateSummary() {
    const chambreId = document.getElementById('chambre-select').value;
    const dateArrivee = document.getElementById('date-arrivee').value;
    const dateDepart = document.getElementById('date-depart').value;
    const summaryBox = document.getElementById('booking-summary');
    const btnReserver = document.getElementById('btn-reserver');

    if (!chambreId || !dateArrivee || !dateDepart) {
        summaryBox.classList.add('hidden');
        btnReserver.disabled = true;
        return;
    }

    const room = availableRooms.find(r => r.id === chambreId);
    if (!room) return;

    const start = new Date(dateArrivee);
    const end = new Date(dateDepart);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const total = diffDays * room.prix_par_nuit;

    document.getElementById('summary-room').textContent = `${room.type} (N°${room.numero_chambre})`;
    document.getElementById('summary-nights').textContent = diffDays;
    document.getElementById('summary-total').textContent = total.toLocaleString('fr-FR');
    
    summaryBox.classList.remove('hidden');
    btnReserver.disabled = false;
}

async function handleReservation(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-reserver');
    const originalText = btn.textContent;
    btn.textContent = "Réservation en cours...";
    btn.disabled = true;

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error("Session expirée, veuillez vous reconnecter.");

        const id_client = session.user.id;
        const id_chambre = document.getElementById('chambre-select').value;
        const date_arrivee = document.getElementById('date-arrivee').value;
        const date_depart = document.getElementById('date-depart').value;

        // Insertion dans la base
        const { error } = await supabaseClient
            .from('reservations')
            .insert([
                {
                    id_client,
                    id_chambre,
                    date_arrivee,
                    date_depart,
                    statut: 'confirmee'
                }
            ]);

        // Gestion de l'erreur spécifique à la contrainte d'exclusion (chevauchement)
        if (error) {
            console.error(error);
            if (error.code === '23P01') {
                throw new Error("Désolé, cette chambre vient juste d'être réservée sur ces dates ! Veuillez en choisir une autre.");
            }
            throw new Error("Une erreur est survenue lors de la réservation : " + error.message);
        }

        showAlert("Réservation confirmée avec succès !", "success");
        document.getElementById('booking-summary').classList.add('hidden');
        document.getElementById('reservation-form').reset();
        
        setTimeout(() => {
            window.location.href = "index.html"; // Redirection vers l'accueil (ou Mes Réservations plus tard)
        }, 2000);

    } catch (error) {
        showAlert(error.message, "error");
        btn.textContent = originalText;
        btn.disabled = false;
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
