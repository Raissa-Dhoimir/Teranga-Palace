// js/apercu-chambres.js
// Version allégée pour afficher un aperçu de chambres sur la page d'accueil

document.addEventListener('DOMContentLoaded', () => {
    fetchApercuChambres();
});

const imagesMap = {
    'Chambre Simple': ['Chambre Simple (2).jpg', 'Chambre simple.jpg', 'chambre.jpg'],
    'Chambre Double': ['Chambre (2).jpg', 'Chambre (3).jpg'],
    'Chambre VIP': ['Chambre VIP 2.jpg', 'Chambre vip 3.jpg', 'chambre VIP (2).jpg', 'chambre VIP.jpg'],
    'Suite': ['Suit.jpg', 'Suite 1.jpg', 'Suite 2.jpg', 'Suite 3.jpg', 'Suite 4.jpg', 'Suite 5.jpg']
};

function getImageForType(type, index) {
    let category = 'Chambre Double';
    if (type.toLowerCase().includes('simple')) category = 'Chambre Simple';
    else if (type.toLowerCase().includes('vip')) category = 'Chambre VIP';
    else if (type.toLowerCase().includes('suite')) category = 'Suite';
    else if (type.toLowerCase().includes('double')) category = 'Chambre Double';

    const images = imagesMap[category];
    return `assetes/${images[index % images.length]}`;
}

async function fetchApercuChambres() {
    const grid = document.getElementById('rooms-grid');
    if (!grid) return; // sécurité si la section n'existe pas sur cette page

    try {
        const { data: chambres, error } = await supabaseClient
             .from('chambres')
             .select('*')
             .order('prix_par_nuit', { ascending: true })
             .order('numero_chambre', { ascending: true })
             .limit(6); // seulement 6 chambres en aperçu

        if (error) throw error;

        if (!chambres || chambres.length === 0) {
            grid.innerHTML = `<div class="empty-state"><p>Aucune chambre disponible pour le moment.</p></div>`;
            return;
        }

        grid.innerHTML = '';

        chambres.forEach((chambre, index) => {
            const imageUrl = getImageForType(chambre.type, index);
            const statutClass = chambre.statut;
            let statutText = 'Disponible';
            if (statutClass === 'occupee') statutText = 'Occupée';
            if (statutClass === 'hors_service') statutText = 'Hors service';

            const canBook = statutClass === 'disponible';
            const btnClass = canBook ? 'btn-primary' : 'btn-disabled';
            const btnState = canBook ? '' : 'disabled';
            const btnText = canBook ? 'Réserver' : 'Non disponible';
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
        console.error("Erreur lors de la récupération de l'aperçu des chambres:", error);
        grid.innerHTML = `<div class="empty-state" style="color: var(--color-error);"><p>Impossible de charger les chambres.</p></div>`;
    }
}