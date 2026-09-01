// js/chambres.js

document.addEventListener('DOMContentLoaded', () => {
    fetchChambres();
});

// Mapping des types de chambre vers les images fournies dans le dossier assetes
const imagesMap = {
    'Chambre Simple': ['Chambre Simple (2).jpg', 'Chambre simple.jpg', 'chambre.jpg'],
    'Chambre Double': ['Chambre (2).jpg', 'Chambre (3).jpg'],
    'Chambre VIP': ['Chambre VIP 2.jpg', 'Chambre vip 3.jpg', 'chambre VIP (2).jpg', 'chambre VIP.jpg'],
    'Suite': ['Suit.jpg', 'Suite 1.jpg', 'Suite 2.jpg', 'Suite 3.jpg', 'Suite 4.jpg', 'Suite 5.jpg']
};

// Fonction pour obtenir une image aléatoire selon le type
function getImageForType(type, index) {
    // Essayer de correspondre au type, sinon fallback sur une image par défaut
    let category = 'Chambre Double'; // Par défaut

    if (type.toLowerCase().includes('simple')) category = 'Chambre Simple';
    else if (type.toLowerCase().includes('vip')) category = 'Chambre VIP';
    else if (type.toLowerCase().includes('suite')) category = 'Suite';
    else if (type.toLowerCase().includes('double')) category = 'Chambre Double';

    const images = imagesMap[category];
    const image = images[index % images.length];

    return `assetes/${image}`;
}

async function fetchChambres() {
    const grid = document.getElementById('rooms-grid');

    try {
        const { data: chambres, error } = await supabaseClient
            .from('chambres')
            .select('*')
            .order('prix_par_nuit', { ascending: true });

        if (error) throw error;

        if (chambres.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>Aucune chambre disponible</h3>
                    <p>Il n'y a actuellement aucune chambre enregistrée dans la base de données.</p>
                </div>
            `;
            // Afficher le bouton de dev pour peupler la BDD (réservé à l'admin ou en mode dev)
            const seedBtn = document.getElementById('dev-seed-rooms');
            if (seedBtn) seedBtn.classList.remove('hidden');
            return;
        }

        grid.innerHTML = ''; // Clear loader

        chambres.forEach((chambre, index) => {
            const imageUrl = getImageForType(chambre.type, index);
            const statutClass = chambre.statut; // disponible, occupee, hors_service
            let statutText = 'Disponible';
            if (statutClass === 'occupee') statutText = 'Occupée';
            if (statutClass === 'hors_service') statutText = 'Hors service';

            // Empêcher la réservation si pas disponible
            const canBook = statutClass === 'disponible';
            const btnClass = canBook ? 'btn-primary' : 'btn-disabled';
            const btnState = canBook ? '' : 'disabled';
            const btnText = canBook ? 'Réserver' : 'Non disponible';

            // Redirection vers la page de réservation avec l'ID de la chambre
            const bookAction = canBook ? `onclick="window.location.href='reservation.html?room=${chambre.id}'"` : '';

            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <div class="room-image-container">
                    <div class="room-badge ${statutClass}">${statutText}</div>
                    <img src="${imageUrl}" alt="${chambre.type}" class="room-image" onerror="this.src='assetes/pexels-erik-karits-2093459-10923534.jpg'">
                </div>
                <div class="room-details">
                    <div class="room-type">${chambre.type}</div>
                    <h3 class="room-title">Chambre ${chambre.numero_chambre}</h3>
                    
                    <div class="room-info">
                        <span>👤 Capacité: ${chambre.capacite} pers.</span>
                    </div>
                    
                    <div class="room-price">
                        ${chambre.prix_par_nuit.toLocaleString('fr-FR')} FCFA <span>/ nuit</span>
                    </div>
                    
                    <button class="btn ${btnClass} btn-book" ${btnState} ${bookAction}>
                        ${btnText}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des chambres:", error);
        grid.innerHTML = `
            <div class="empty-state" style="color: var(--color-error);">
                <h3>Erreur</h3>
                <p>Impossible de charger les chambres. Vérifiez la connexion à SupabaseClient.</p>
            </div>
        `;
    }
}

// Fonction utilitaire de développement pour injecter des chambres de test (Lot 4)
async function seedRooms() {
    const btn = document.getElementById('dev-seed-rooms');
    btn.textContent = "Génération...";
    btn.disabled = true;

    const testRooms = [
        { numero_chambre: "101", type: "Chambre Simple", prix_par_nuit: 25000, capacite: 1, statut: "disponible" },
        { numero_chambre: "102", type: "Chambre Simple", prix_par_nuit: 25000, capacite: 1, statut: "occupee" },
        { numero_chambre: "201", type: "Chambre Double", prix_par_nuit: 40000, capacite: 2, statut: "disponible" },
        { numero_chambre: "202", type: "Chambre Double", prix_par_nuit: 40000, capacite: 2, statut: "disponible" },
        { numero_chambre: "301", type: "Chambre VIP", prix_par_nuit: 75000, capacite: 2, statut: "disponible" },
        { numero_chambre: "302", type: "Chambre VIP", prix_par_nuit: 75000, capacite: 2, statut: "hors_service" },
        { numero_chambre: "401", type: "Suite", prix_par_nuit: 120000, capacite: 4, statut: "disponible" },
        { numero_chambre: "402", type: "Suite", prix_par_nuit: 150000, capacite: 4, statut: "disponible" }
    ];

    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        if (!sessionData || !sessionData.session) {
            alert("⚠️ Vous devez être connecté avec un compte Administrateur pour injecter des données.");
            btn.textContent = "Générer des chambres de test";
            btn.disabled = false;
            return;
        }

        const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', sessionData.session.user.id).single();

        if (!profile || profile.role !== 'admin') {
            alert("⚠️ Seul un compte Administrateur peut injecter des données ! Connectez-vous avec un compte admin.");
            btn.textContent = "Générer des chambres de test";
            btn.disabled = false;
            return;
        }

        const { error } = await supabaseClient.from('chambres').insert(testRooms);
        if (error) throw error;

        alert("Chambres de test générées avec succès !");
        btn.classList.add('hidden');
        fetchChambres();
    } catch (e) {
        console.error(e);
        alert("Erreur lors de la génération. Avez-vous les droits admin ? " + e.message);
        btn.textContent = "Générer des chambres de test";
        btn.disabled = false;
    }
}
