// js/admin.js
// Lot 8 : Espace Admin — gestion clients / chambres

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier session et rôle admin
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "auth.html";
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        alert("Accès refusé. Cette page est réservée aux administrateurs.");
        window.location.href = "index.html";
        return;
    }

    loadClients();
    loadChambresAdmin();
    loadReservationsAdmin();
    loadSejoursAdmin();
    loadPaiementsAdmin();
});

function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    if (event && event.target) event.target.classList.add('active');
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    // Reset forms
    if (id === 'modal-client') {
        document.getElementById('client-id-edit').value = '';
        document.getElementById('client-nom').value = '';
        document.getElementById('client-prenom').value = '';
        document.getElementById('client-telephone').value = '';
        document.getElementById('client-adresse').value = '';
        document.getElementById('client-role').value = 'client';
        document.getElementById('modal-client-title').textContent = 'Ajouter un client';
    }
    if (id === 'modal-chambre') {
        document.getElementById('chambre-id-edit').value = '';
        document.getElementById('chambre-numero').value = '';
        document.getElementById('chambre-prix').value = '';
        document.getElementById('chambre-capacite').value = '';
        document.getElementById('chambre-statut').value = 'disponible';
        document.getElementById('modal-chambre-title').textContent = 'Ajouter une chambre';
    }
}

// ============================================================
// CLIENTS
// ============================================================
async function loadClients() {
    const tbody = document.getElementById('clients-list');
    try {
        const { data: clients, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('nom', { ascending: true });

        if (error) throw error;

        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucun client enregistré.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        clients.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.nom || '-'}</td>
                <td>${c.prenom || '-'}</td>
                <td>${c.email}</td>
                <td>${c.telephone || '-'}</td>
                <td>${c.adresse || '-'}</td>
                <td><span class="status-badge" style="background:rgba(255,115,76,0.1);color:var(--color-primary);">${c.role}</span></td>
                <td style="display:flex;gap:8px;">
                    <button class="btn" style="background:var(--color-secondary);color:#333;padding:5px 10px;font-size:0.8rem;" onclick="editClient('${c.id}', '${c.nom || ''}', '${c.prenom || ''}', '${c.telephone || ''}', '${c.adresse || ''}', '${c.role}')">Modifier</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Erreur : ${error.message}</td></tr>`;
    }
}

function editClient(id, nom, prenom, telephone, adresse, role) {
    document.getElementById('client-id-edit').value = id;
    document.getElementById('client-nom').value = nom;
    document.getElementById('client-prenom').value = prenom;
    document.getElementById('client-telephone').value = telephone;
    document.getElementById('client-adresse').value = adresse;
    document.getElementById('client-role').value = role;
    document.getElementById('modal-client-title').textContent = 'Modifier le client';
    openModal('modal-client');
}

async function saveClient() {
    const id = document.getElementById('client-id-edit').value;
    const nom = document.getElementById('client-nom').value.trim();
    const prenom = document.getElementById('client-prenom').value.trim();
    const telephone = document.getElementById('client-telephone').value.trim();
    const adresse = document.getElementById('client-adresse').value.trim();
    const role = document.getElementById('client-role').value;

    if (!nom) { showAlert("Le nom est obligatoire.", "error"); return; }

    try {
        if (id) {
            // Mise à jour
            const { error } = await supabaseClient
                .from('profiles')
                .update({ nom, prenom, telephone, adresse, role })
                .eq('id', id);
            if (error) throw error;
            showAlert("Client mis à jour avec succès.", "success");
        } else {
            // L'ajout d'un client se fait via l'inscription (Supabase Auth)
            showAlert("Pour ajouter un client, utilisez la page d'inscription. Vous pouvez ensuite modifier son profil ici.", "error");
            closeModal('modal-client');
            return;
        }
        closeModal('modal-client');
        loadClients();
    } catch (error) {
        console.error(error);
        showAlert("Erreur : " + error.message, "error");
    }
}

// ============================================================
// CHAMBRES
// ============================================================
async function loadChambresAdmin() {
    const tbody = document.getElementById('chambres-list');
    try {
        const { data: chambres, error } = await supabaseClient
            .from('chambres')
            .select('*')
            .order('numero_chambre', { ascending: true });

        if (error) throw error;

        if (chambres.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucune chambre enregistrée.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        chambres.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.numero_chambre}</strong></td>
                <td>${c.type}</td>
                <td>${Number(c.prix_par_nuit).toLocaleString('fr-FR')} FCFA</td>
                <td>${c.capacite} pers.</td>
                <td><span class="status-badge status-${c.statut}">${c.statut.replace('_', ' ')}</span></td>
                <td style="display:flex;gap:8px;">
                    <button class="btn" style="background:var(--color-secondary);color:#333;padding:5px 10px;font-size:0.8rem;"
                        onclick="editChambre('${c.id}', '${c.numero_chambre}', '${c.type}', ${c.prix_par_nuit}, ${c.capacite}, '${c.statut}')">
                        Modifier
                    </button>
                    <button class="btn" style="background:var(--color-error);color:white;padding:5px 10px;font-size:0.8rem;"
                        onclick="toggleHorsService('${c.id}', '${c.statut}')">
                        ${c.statut === 'hors_service' ? 'Remettre en service' : 'Hors service'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erreur : ${error.message}</td></tr>`;
    }
}

function editChambre(id, numero, type, prix, capacite, statut) {
    document.getElementById('chambre-id-edit').value = id;
    document.getElementById('chambre-numero').value = numero;
    document.getElementById('chambre-type').value = type;
    document.getElementById('chambre-prix').value = prix;
    document.getElementById('chambre-capacite').value = capacite;
    document.getElementById('chambre-statut').value = statut;
    document.getElementById('modal-chambre-title').textContent = 'Modifier la chambre';
    openModal('modal-chambre');
}

async function saveChambre() {
    const id = document.getElementById('chambre-id-edit').value;
    const numero_chambre = document.getElementById('chambre-numero').value.trim();
    const type = document.getElementById('chambre-type').value;
    const prix_par_nuit = parseFloat(document.getElementById('chambre-prix').value);
    const capacite = parseInt(document.getElementById('chambre-capacite').value);
    const statut = document.getElementById('chambre-statut').value;

    if (!numero_chambre || isNaN(prix_par_nuit) || isNaN(capacite)) {
        showAlert("Veuillez remplir tous les champs obligatoires.", "error");
        return;
    }

    const payload = { numero_chambre, type, prix_par_nuit, capacite, statut };

    try {
        if (id) {
            const { error } = await supabaseClient.from('chambres').update(payload).eq('id', id);
            if (error) throw error;
            showAlert("Chambre mise à jour.", "success");
        } else {
            const { error } = await supabaseClient.from('chambres').insert([payload]);
            if (error) throw error;
            showAlert("Chambre ajoutée avec succès.", "success");
        }
        closeModal('modal-chambre');
        loadChambresAdmin();
    } catch (error) {
        console.error(error);
        showAlert("Erreur : " + error.message, "error");
    }
}

async function toggleHorsService(id, statutActuel) {
    const nouveauStatut = statutActuel === 'hors_service' ? 'disponible' : 'hors_service';
    const message = nouveauStatut === 'hors_service'
        ? "Mettre cette chambre hors service ?"
        : "Remettre cette chambre en service ?";

    if (!confirm(message)) return;

    try {
        const { error } = await supabaseClient.from('chambres').update({ statut: nouveauStatut }).eq('id', id);
        if (error) throw error;
        showAlert(`Chambre passée à « ${nouveauStatut.replace('_', ' ')} ».`, "success");
        loadChambresAdmin();
    } catch (error) {
        showAlert("Erreur : " + error.message, "error");
    }
}

// ============================================================
// Utilitaires
// ============================================================
function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert-container');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 5000);
    }
}

// ============================================================
// LOT 9 : RESERVATIONS (admin)
// ============================================================
async function loadReservationsAdmin() {
    const tbody = document.getElementById('reservations-admin-list');
    try {
        const { data, error } = await supabaseClient
            .from('reservations')
            .select(`*, profiles(nom, prenom, email), chambres(numero_chambre, type)`)
            .order('date_arrivee', { ascending: false });

        if (error) throw error;
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucune réservation.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(r => {
            const client = r.profiles ? `${r.profiles.prenom || ''} ${r.profiles.nom || ''} (${r.profiles.email})` : '-';
            const chambre = r.chambres ? `${r.chambres.type} N°${r.chambres.numero_chambre}` : '-';
            const arr = new Date(r.date_arrivee).toLocaleDateString('fr-FR');
            const dep = new Date(r.date_depart).toLocaleDateString('fr-FR');

            const canCancel = r.statut !== 'annulee';
            const btnAnnuler = canCancel
                ? `<button class="btn" style="background:var(--color-error);color:white;padding:5px 10px;font-size:0.8rem;" onclick="adminCancelReservation('${r.id}')">Annuler</button>`
                : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${client}</td>
                <td>${chambre}</td>
                <td>${arr}</td>
                <td>${dep}</td>
                <td><span class="status-badge status-${r.statut}">${r.statut}</span></td>
                <td>${btnAnnuler}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erreur : ${e.message}</td></tr>`;
    }
}

async function adminCancelReservation(id) {
    if (!confirm("Annuler cette réservation ?")) return;
    try {
        const { error } = await supabaseClient.from('reservations').update({ statut: 'annulee' }).eq('id', id);
        if (error) throw error;
        showAlert("Réservation annulée.", "success");
        loadReservationsAdmin();
    } catch (e) {
        showAlert("Erreur : " + e.message, "error");
    }
}

// ============================================================
// LOT 9 : SEJOURS — Check-in / Check-out (admin)
// ============================================================
async function loadSejoursAdmin() {
    const tbody = document.getElementById('sejours-admin-list');
    try {
        const { data, error } = await supabaseClient
            .from('sejours')
            .select(`*, profiles(nom, prenom), chambres(numero_chambre, type)`)
            .order('date_arrivee', { ascending: false });

        if (error) throw error;
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun séjour enregistré.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            const client = s.profiles ? `${s.profiles.prenom || ''} ${s.profiles.nom || ''}` : '-';
            const chambre = s.chambres ? `${s.chambres.type} N°${s.chambres.numero_chambre}` : '-';
            const arr = new Date(s.date_arrivee).toLocaleDateString('fr-FR');
            const dep = s.date_depart ? new Date(s.date_depart).toLocaleDateString('fr-FR') : '<em>En cours</em>';
            const montant = s.montant_total ? s.montant_total.toLocaleString('fr-FR') + ' FCFA' : '-';

            // Check-out uniquement si le séjour est en cours (pas de date_depart)
            const btnCheckout = !s.date_depart
                ? `<button class="btn btn-primary" style="padding:5px 10px;font-size:0.8rem;" onclick="doCheckOut('${s.id}', '${s.id_chambre}')">🚪 Check-out</button>`
                : '<span style="color:#2ecc71;font-weight:600;">✅ Terminé</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${client}</td>
                <td>${chambre}</td>
                <td>${arr}</td>
                <td>${dep}</td>
                <td>${montant}</td>
                <td>${btnCheckout}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erreur : ${e.message}</td></tr>`;
    }
}

// Ouvrir la modale check-in et charger les réservations confirmées sans séjour
async function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    if (id === 'modal-checkin') {
        const select = document.getElementById('checkin-reservation-select');
        select.innerHTML = '<option value="">Chargement...</option>';
        try {
            // Réservations confirmées
            const { data: resa, error: errResa } = await supabaseClient
                .from('reservations')
                .select(`*, profiles(nom, prenom), chambres(numero_chambre, type)`)
                .eq('statut', 'confirmee');
            if (errResa) throw errResa;

            // Séjours existants (pour exclure les réservations déjà en séjour)
            const { data: sejours } = await supabaseClient.from('sejours').select('id_reservation');
            const existingResaIds = (sejours || []).map(s => s.id_reservation);

            const disponibles = resa.filter(r => !existingResaIds.includes(r.id));

            if (disponibles.length === 0) {
                select.innerHTML = '<option value="">Aucune réservation confirmée disponible</option>';
                return;
            }
            select.innerHTML = '<option value="">-- Choisir une réservation --</option>';
            disponibles.forEach(r => {
                const client = r.profiles ? `${r.profiles.prenom} ${r.profiles.nom}` : '-';
                const chambre = r.chambres ? `${r.chambres.type} N°${r.chambres.numero_chambre}` : '-';
                const arr = new Date(r.date_arrivee).toLocaleDateString('fr-FR');
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ id: r.id, id_client: r.id_client, id_chambre: r.id_chambre, date_arrivee: r.date_arrivee, date_depart: r.date_depart });
                opt.textContent = `${client} — ${chambre} (arr. ${arr})`;
                select.appendChild(opt);
            });
        } catch (e) {
            select.innerHTML = `<option value="">Erreur : ${e.message}</option>`;
        }
    }
}

async function doCheckIn() {
    const select = document.getElementById('checkin-reservation-select');
    if (!select.value) { showAlert("Veuillez sélectionner une réservation.", "error"); return; }

    const resa = JSON.parse(select.value);
    try {
        // 1. Créer le séjour
        const { error: errSejour } = await supabaseClient.from('sejours').insert([{
            id_reservation: resa.id,
            id_client: resa.id_client,
            id_chambre: resa.id_chambre,
            date_arrivee: resa.date_arrivee
        }]);
        if (errSejour) throw errSejour;

        // 2. Mettre la chambre à occupee
        const { error: errChambre } = await supabaseClient.from('chambres').update({ statut: 'occupee' }).eq('id', resa.id_chambre);
        if (errChambre) throw errChambre;

        showAlert("Check-in effectué avec succès ! La chambre est maintenant occupée.", "success");
        closeModal('modal-checkin');
        loadSejoursAdmin();
        loadChambresAdmin();
    } catch (e) {
        showAlert("Erreur check-in : " + e.message, "error");
    }
}

async function doCheckOut(sejourId, chambreId) {
    if (!confirm("Confirmer le check-out ? Le montant sera calculé automatiquement.")) return;
    try {
        // 1. Charger le séjour pour calculer le montant
        const { data: sejour, error: errLoad } = await supabaseClient
            .from('sejours')
            .select(`*, chambres(prix_par_nuit)`)
            .eq('id', sejourId)
            .single();
        if (errLoad) throw errLoad;

        const dateDepart = new Date().toISOString().split('T')[0];
        const dateArrivee = new Date(sejour.date_arrivee);
        const dateDepartDate = new Date(dateDepart);
        const nuits = Math.max(1, Math.ceil((dateDepartDate - dateArrivee) / (1000 * 60 * 60 * 24)));
        const montantTotal = nuits * parseFloat(sejour.chambres.prix_par_nuit);

        // 2. Mettre à jour le séjour
        const { error: errSejour } = await supabaseClient
            .from('sejours')
            .update({ date_depart: dateDepart, montant_total: montantTotal })
            .eq('id', sejourId);
        if (errSejour) throw errSejour;

        // 3. Remettre la chambre disponible
        const { error: errChambre } = await supabaseClient.from('chambres').update({ statut: 'disponible' }).eq('id', chambreId);
        if (errChambre) throw errChambre;

        // 4. Créer automatiquement la facture
        const numeroFacture = `FAC-${Date.now()}`;
        const { error: errFacture } = await supabaseClient.from('factures').insert([{

            numero_facture: numeroFacture,
            id_sejour: sejourId,
            montant_total: montantTotal,
            statut: 'impayee'
        }]);
        if (errFacture) throw errFacture;

        showAlert(`Check-out effectué ! ${nuits} nuit(s) — ${montantTotal.toLocaleString('fr-FR')} FCFA. Facture ${numeroFacture} créée.`, "success");
        loadSejoursAdmin();
        loadChambresAdmin();
        loadPaiementsAdmin();
    } catch (e) {
        showAlert("Erreur check-out : " + e.message, "error");
    }
}

// ============================================================
// LOT 9 : PAIEMENTS (admin)
// ============================================================
async function loadPaiementsAdmin() {
    const tbody = document.getElementById('paiements-admin-list');
    try {
        const { data, error } = await supabaseClient
            .from('factures')
            .select(`*, sejours(id_client, profiles(nom, prenom)), paiements(*)`)
            .order('date_facture', { ascending: false });

        if (error) throw error;
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucune facture.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(f => {
            const client = f.sejours && f.sejours.profiles ? `${f.sejours.profiles.prenom || ''} ${f.sejours.profiles.nom || ''}` : '-';
            const dateF = new Date(f.date_facture).toLocaleDateString('fr-FR');
            const montant = f.montant_total.toLocaleString('fr-FR') + ' FCFA';

            // Dernier paiement associé
            const paiement = f.paiements && f.paiements.length > 0 ? f.paiements[f.paiements.length - 1] : null;
            const datePaie = paiement ? new Date(paiement.date_paiement).toLocaleDateString('fr-FR') : '-';
            const montantPaie = paiement ? paiement.montant.toLocaleString('fr-FR') + ' FCFA' : '-';
            const modePaie = paiement ? paiement.mode_paiement : '-';

            // L'admin peut manuellement marquer comme payée
            const btnMarquer = f.statut !== 'payee'
                ? `<button class="btn btn-primary" style="padding:5px 10px;font-size:0.8rem;" onclick="marquerPayee('${f.id}')">✅ Marquer payée</button>`
                : '<span style="color:#2ecc71;font-weight:600;">Payée</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.numero_facture}</td>
                <td>${client}</td>
                <td>${datePaie}</td>
                <td>${montantPaie || montant}</td>
                <td>${modePaie}</td>
                <td><span class="status-badge status-${f.statut}">${f.statut.replace('_', ' ')}</span></td>
                <td>${btnMarquer}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Erreur : ${e.message}</td></tr>`;
    }
}

async function marquerPayee(factureId) {
    if (!confirm("Marquer manuellement cette facture comme payée ?")) return;
    try {
        const { error } = await supabaseClient.from('factures').update({ statut: 'payee' }).eq('id', factureId);
        if (error) throw error;
        showAlert("Facture marquée comme payée.", "success");
        loadPaiementsAdmin();
    } catch (e) {
        showAlert("Erreur : " + e.message, "error");
    }
}
