// js/statistiques.js
// Lot 10 : Statistiques admin

let chartRevenus = null;
let chartStatut = null;
let chartTopChambres = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Vérification admin
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = "auth.html"; return; }

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', session.user.id).single();
    if (!profile || profile.role !== 'admin') {
        alert("Accès réservé aux administrateurs.");
        window.location.href = "index.html";
        return;
    }

    loadAllStats();
});

function getPeriodeRange(periode) {
    const now = new Date();
    let debut;
    if (periode === 'mois') {
        debut = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periode === 'trimestre') {
        const trimestre = Math.floor(now.getMonth() / 3);
        debut = new Date(now.getFullYear(), trimestre * 3, 1);
    } else {
        debut = new Date(now.getFullYear(), 0, 1);
    }
    return debut.toISOString().split('T')[0];
}

async function loadAllStats() {
    const periode = document.getElementById('periode-select').value;
    const dateDebut = getPeriodeRange(periode);

    await Promise.all([
        loadKpis(dateDebut),
        loadChartRevenus(),
        loadChartStatutReservations(dateDebut),
        loadChartTopChambres(dateDebut),
        loadFacturesImpayees()
    ]);
}

// ============================================================
// KPIs
// ============================================================
async function loadKpis(dateDebut) {
    try {
        // 1. Taux d'occupation = chambres occupées / total chambres
        const { data: chambres } = await supabaseClient.from('chambres').select('statut');
        const total = chambres.length;
        const occupees = chambres.filter(c => c.statut === 'occupee').length;
        const taux = total > 0 ? Math.round((occupees / total) * 100) : 0;
        document.getElementById('kpi-taux-occupation').textContent = `${taux}%`;

        // 2. Revenus (somme des factures payées sur la période)
        const { data: factures } = await supabaseClient
            .from('factures')
            .select('montant_total')
            .eq('statut', 'payee')
            .gte('date_facture', dateDebut);
        const revenus = factures.reduce((acc, f) => acc + parseFloat(f.montant_total), 0);
        document.getElementById('kpi-revenus').textContent = revenus.toLocaleString('fr-FR');

        // 3. Réservations sur la période
        const { data: resa } = await supabase
            .from('reservations')
            .select('id')
            .gte('date_reservation', dateDebut);
        document.getElementById('kpi-reservations').textContent = resa.length;

        // 4. Séjours complétés sur la période
        const { data: sejours } = await supabaseClient
            .from('sejours')
            .select('id')
            .not('date_depart', 'is', null)
            .gte('date_arrivee', dateDebut);
        document.getElementById('kpi-sejours').textContent = sejours.length;

    } catch (e) {
        console.error("Erreur KPIs:", e);
    }
}

// ============================================================
// Graphique : Revenus par mois (12 derniers mois)
// ============================================================
async function loadChartRevenus() {
    try {
        const { data: factures } = await supabaseClient
            .from('factures')
            .select('montant_total, date_facture')
            .eq('statut', 'payee');

        // Regrouper par mois
        const moisLabels = [];
        const moisData = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            moisLabels.push(label);

            const total = factures
                .filter(f => {
                    const fd = new Date(f.date_facture);
                    return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth();
                })
                .reduce((acc, f) => acc + parseFloat(f.montant_total), 0);
            moisData.push(total);
        }

        const ctx = document.getElementById('chart-revenus').getContext('2d');
        if (chartRevenus) chartRevenus.destroy();
        chartRevenus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: moisLabels,
                datasets: [{
                    label: 'Revenus (FCFA)',
                    data: moisData,
                    backgroundColor: 'rgba(255, 115, 76, 0.7)',
                    borderColor: '#FF734C',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => v.toLocaleString('fr-FR') }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erreur chart revenus:", e);
    }
}

// ============================================================
// Graphique : Réservations par statut (donut)
// ============================================================
async function loadChartStatutReservations(dateDebut) {
    try {
        const { data: resa } = await supabaseClient
            .from('reservations')
            .select('statut')
            .gte('date_reservation', dateDebut);

        const counts = { confirmee: 0, en_attente: 0, annulee: 0 };
        resa.forEach(r => { if (counts[r.statut] !== undefined) counts[r.statut]++; });

        const ctx = document.getElementById('chart-statut-reservations').getContext('2d');
        if (chartStatut) chartStatut.destroy();
        chartStatut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Confirmées', 'En attente', 'Annulées'],
                datasets: [{
                    data: [counts.confirmee, counts.en_attente, counts.annulee],
                    backgroundColor: ['#2ecc71', '#FFCD4C', '#E4453B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    } catch (e) {
        console.error("Erreur chart statuts:", e);
    }
}

// ============================================================
// Graphique : Top chambres les plus réservées
// ============================================================
async function loadChartTopChambres(dateDebut) {
    try {
        const { data: resa } = await supabaseClient
            .from('reservations')
            .select(`id_chambre, chambres(numero_chambre, type)`)
            .neq('statut', 'annulee')
            .gte('date_reservation', dateDebut);

        // Compter par chambre
        const comptage = {};
        resa.forEach(r => {
            const label = r.chambres ? `${r.chambres.type} N°${r.chambres.numero_chambre}` : r.id_chambre;
            comptage[label] = (comptage[label] || 0) + 1;
        });

        // Trier et prendre le top 8
        const sorted = Object.entries(comptage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const ctx = document.getElementById('chart-top-chambres').getContext('2d');
        if (chartTopChambres) chartTopChambres.destroy();
        chartTopChambres = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(e => e[0]),
                datasets: [{
                    label: 'Nombre de réservations',
                    data: sorted.map(e => e[1]),
                    backgroundColor: 'rgba(255, 76, 126, 0.7)',
                    borderColor: '#FF4C7E',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    } catch (e) {
        console.error("Erreur chart top chambres:", e);
    }
}

// ============================================================
// Tableau : Factures impayées
// ============================================================
async function loadFacturesImpayees() {
    const tbody = document.getElementById('impayees-list');
    try {
        const { data, error } = await supabaseClient
            .from('factures')
            .select(`*, sejours(profiles(nom, prenom))`)
            .eq('statut', 'impayee')
            .order('date_facture', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#2ecc71;font-weight:600;">✅ Aucune facture impayée !</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(f => {
            const client = f.sejours && f.sejours.profiles
                ? `${f.sejours.profiles.prenom || ''} ${f.sejours.profiles.nom || ''}`
                : '-';
            const dateF = new Date(f.date_facture).toLocaleDateString('fr-FR');
            const montant = parseFloat(f.montant_total).toLocaleString('fr-FR') + ' FCFA';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.numero_facture}</td>
                <td>${client}</td>
                <td style="font-weight:700;color:var(--color-error);">${montant}</td>
                <td>${dateF}</td>
                <td>
                    <button class="btn btn-primary" style="padding:5px 10px;font-size:0.8rem;"
                        onclick="marquerPayeeStats('${f.id}')">✅ Marquer payée</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Erreur : ${e.message}</td></tr>`;
    }
}

async function marquerPayeeStats(factureId) {
    if (!confirm("Marquer cette facture comme payée ?")) return;
    try {
        const { error } = await supabaseClient.from('factures').update({ statut: 'payee' }).eq('id', factureId);
        if (error) throw error;
        loadFacturesImpayees();
        loadAllStats();
    } catch (e) {
        alert("Erreur : " + e.message);
    }
}
