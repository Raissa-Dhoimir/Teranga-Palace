/**
 * Configuration et initialisation du client Supabase
 * Remplacer SUPABASE_URL et SUPABASE_ANON_KEY par les vraies valeurs 
 * fournies dans le tableau de bord Supabase.
 */

const SUPABASE_URL = 'https://anznjdlziwbbbetckxew.supabase.co'; // TODO: Remplacer par l'URL réelle
const SUPABASE_ANON_KEY = 'sb_publishable_8LHAqf-ilogt3X6mR8z3NA_EvuWF7nP'; // TODO: Remplacer par la clé réelle

// Vérification basique pour éviter des erreurs silencieuses si non configuré
if (SUPABASE_URL === 'https://VOTRE_PROJET.supabase.co') {
    console.warn("⚠️ Attention : Supabase n'est pas encore configuré. N'oubliez pas de mettre à jour supabase-config.js.");
}

// Initialisation du client (accessible globalement dans les autres scripts)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase client initialisé :", supabaseClient);
