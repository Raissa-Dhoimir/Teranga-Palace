// js/paiement.js
// Lot 7 : Paiement simulé (100% côté client, aucune transaction réelle)

let factureData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "auth.html";
        return;
    }

    // Récupérer l'ID de la facture depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const factureId = urlParams.get('facture');

    if (!factureId) {
        showAlert("Aucune facture spécifiée.", "error");
        return;
    }

    await loadFacture(factureId);

    document.getElementById('paiement-form').addEventListener('submit', handlePaiement);
});

async function loadFacture(factureId) {
    try {
        // Charger la facture + le séjour + la chambre associés
        const { data: facture, error } = await supabase
            .from('factures')
            .select(`
                *,
                sejours (
                    date_arrivee,
                    date_depart,
                    chambres (numero_chambre, type)
                )
            `)
            .eq('id', factureId)
            .single();

        if (error) throw error;

        factureData = facture;

        // Remplir le résumé
        const sejour = facture.sejours;
        const chambre = sejour ? sejour.chambres : null;

        document.getElementById('facture-subtitle').textContent =
            facture.statut === 'payee' ? 'Cette facture est déjà payée ✅' : 'Procédez au paiement ci-dessous';

        document.getElementById('disp-num-facture').textContent = facture.numero_facture;
        document.getElementById('disp-chambre').textContent = chambre
            ? `${chambre.type} (N°${chambre.numero_chambre})`
            : 'Inconnue';

        if (sejour) {
            const dateArr = new Date(sejour.date_arrivee).toLocaleDateString('fr-FR');
            const dateDep = sejour.date_depart
                ? new Date(sejour.date_depart).toLocaleDateString('fr-FR')
                : 'En cours';
            document.getElementById('disp-sejour').textContent = `${dateArr} → ${dateDep}`;
        } else {
            document.getElementById('disp-sejour').textContent = '-';
        }

        document.getElementById('disp-montant').textContent =
            facture.montant_total.toLocaleString('fr-FR') + ' FCFA';

        document.getElementById('facture-summary').classList.remove('hidden');

        // Afficher le formulaire seulement si la facture n'est pas encore payée
        if (facture.statut !== 'payee') {
            document.getElementById('paiement-form').classList.remove('hidden');
        } else {
            showAlert("Cette facture est déjà marquée comme payée.", "success");
        }

    } catch (error) {
        console.error("Erreur chargement facture:", error);
        showAlert("Impossible de charger la facture. Vérifiez l'identifiant.", "error");
    }
}

async function handlePaiement(e) {
    e.preventDefault();

    const montantSaisi = parseFloat(document.getElementById('montant-saisi').value);
    const modePaiement = document.getElementById('mode-paiement').value;
    const montantDu = parseFloat(factureData.montant_total);
    const btn = document.getElementById('btn-payer');

    btn.textContent = "Traitement...";
    btn.disabled = true;

    // =========================================================
    // Logique de paiement simulé (cahier des charges §5.3)
    // =========================================================
    if (isNaN(montantSaisi) || montantSaisi <= 0) {
        showAlert("Veuillez saisir un montant valide.", "error");
        btn.textContent = "Simuler le paiement";
        btn.disabled = false;
        return;
    }

    if (montantSaisi === montantDu) {
        // ✅ Paiement exact
        await enregistrerPaiement(montantSaisi, modePaiement, "effectue");

    } else if (montantSaisi < montantDu) {
        // ❌ Montant insuffisant
        showAlert(
            "Le montant saisi est inférieur au montant dû. Veuillez saisir le montant exact.",
            "error"
        );
        btn.textContent = "Simuler le paiement";
        btn.disabled = false;

    } else {
        // ❌ Montant trop élevé
        showAlert(
            "Le montant saisi est supérieur au montant dû. Veuillez saisir le montant exact.",
            "error"
        );
        btn.textContent = "Simuler le paiement";
        btn.disabled = false;
    }
}

async function enregistrerPaiement(montant, modePaiement, statut) {
    const btn = document.getElementById('btn-payer');
    try {
        // 1. Créer l'enregistrement du paiement
        const { error: errPaiement } = await supabase
            .from('paiements')
            .insert([{
                id_facture: factureData.id,
                montant: montant,
                mode_paiement: modePaiement,
                statut: statut
            }]);

        if (errPaiement) throw errPaiement;

        // 2. Mettre à jour le statut de la facture
        const { error: errFacture } = await supabase
            .from('factures')
            .update({ statut: 'payee' })
            .eq('id', factureData.id);

        if (errFacture) throw errFacture;

        // ✅ Succès
        showAlert("✅ Paiement effectué avec succès !", "success");

        // Masquer le formulaire et le bouton
        document.getElementById('paiement-form').classList.add('hidden');
        document.getElementById('facture-subtitle').textContent = "Paiement confirmé ✅";

        // Mise à jour locale des données
        factureData.statut = 'payee';

        setTimeout(() => {
            window.location.href = "dashboard-client.html";
        }, 2500);

    } catch (error) {
        console.error("Erreur paiement:", error);
        showAlert("Erreur lors de l'enregistrement du paiement : " + error.message, "error");
        btn.textContent = "Simuler le paiement";
        btn.disabled = false;
    }
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert-container');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.classList.remove('hidden');
    }
}
