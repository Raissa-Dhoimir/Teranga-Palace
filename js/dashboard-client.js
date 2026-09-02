// js/dashboard-client.js

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier session et rôle
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "auth.html";
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) {
        console.error("Erreur profil:", error);
        return;
    }

    if (profile.role === 'admin') {
        window.location.href = "dashboard-admin.html";
        return;
    }

    document.getElementById('client-name').textContent = `${profile.prenom || ''} ${profile.nom || ''}`;

    loadReservations();
    loadSejours();
    loadFactures();
});

function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

async function loadReservations() {
    const tbody = document.getElementById('reservations-list');
    try {
        const { data: reservations, error } = await supabaseClient
            .from('reservations')
            .select(`
                *,
                chambres (numero_chambre, type)
            `)
            .order('date_reservation', { ascending: false });

        if (error) throw error;

        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune réservation trouvée.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        reservations.forEach(r => {
            const dateCrea = new Date(r.date_reservation).toLocaleDateString('fr-FR');
            const dateArr = new Date(r.date_arrivee).toLocaleDateString('fr-FR');
            const dateDep = new Date(r.date_depart).toLocaleDateString('fr-FR');
            
            // Calculer si on peut annuler (48h avant)
            const arriveeTime = new Date(r.date_arrivee).getTime();
            const nowTime = new Date().getTime();
            const canCancel = r.statut !== 'annulee' && (arriveeTime - nowTime > 48 * 60 * 60 * 1000);

            const btnCancel = canCancel 
                ? `<button class="btn" style="background:#e74c3c;color:white;padding:5px 10px;font-size:0.8rem;" onclick="cancelReservation('${r.id}')">Annuler</button>`
                : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateCrea}</td>
                <td>${r.chambres ? r.chambres.type + ' (N°' + r.chambres.numero_chambre + ')' : 'Inconnue'}</td>
                <td>${dateArr}</td>
                <td>${dateDep}</td>
                <td><span class="status-badge status-${r.statut}">${r.statut}</span></td>
                <td>${btnCancel}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Erreur de chargement</td></tr>';
    }
}

async function cancelReservation(id) {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;

    try {
        const { error } = await supabaseClient
            .from('reservations')
            .update({ statut: 'annulee' })
            .eq('id', id);

        if (error) throw error;
        
        showAlert("Réservation annulée.", "success");
        loadReservations(); // Recharger la liste
    } catch (error) {
        console.error(error);
        showAlert("Erreur lors de l'annulation : " + error.message, "error");
    }
}

async function loadSejours() {
    const tbody = document.getElementById('sejours-list');
    try {
        const { data: sejours, error } = await supabaseClient
            .from('sejours')
            .select(`
                *,
                chambres (numero_chambre, type)
            `)
            .order('date_arrivee', { ascending: false });

        if (error) throw error;

        if (sejours.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Aucun séjour trouvé.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        sejours.forEach(s => {
            const dateArr = new Date(s.date_arrivee).toLocaleDateString('fr-FR');
            const dateDep = s.date_depart ? new Date(s.date_depart).toLocaleDateString('fr-FR') : 'En cours';
            const montant = s.montant_total ? s.montant_total.toLocaleString('fr-FR') + ' FCFA' : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.chambres ? s.chambres.type + ' (N°' + s.chambres.numero_chambre + ')' : 'Inconnue'}</td>
                <td>${dateArr}</td>
                <td>${dateDep}</td>
                <td>${montant}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Erreur de chargement</td></tr>';
    }
}

async function loadFactures() {
    const tbody = document.getElementById('factures-list');
    try {
        const { data: factures, error } = await supabaseClient
            .from('factures')
            .select('*')
            .order('date_facture', { ascending: false });

        if (error) throw error;

        if (factures.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Aucune facture trouvée.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        factures.forEach(f => {
            const dateF = new Date(f.date_facture).toLocaleDateString('fr-FR');
            const montant = f.montant_total.toLocaleString('fr-FR') + ' FCFA';
            
            const btnPayer = f.statut === 'impayee'
                ? `<a href="paiement.html?facture=${f.id}" class="btn btn-primary" style="padding:5px 10px;font-size:0.8rem;">Payer</a>`
                : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.numero_facture}</td>
                <td>${dateF}</td>
                <td>${montant}</td>
                <td><span class="status-badge status-${f.statut}">${f.statut.replace('_', ' ')}</span></td>
                <td>${btnPayer}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erreur de chargement</td></tr>';
    }
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert-container');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 5000);
    } else {
        alert(message);
    }
}
