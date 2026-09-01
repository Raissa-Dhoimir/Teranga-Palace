-- ==========================================
-- SCHEMA SQL - HOTEL TERANGA PALACE (Lot 2)
-- ==========================================

-- 0. Activation de l'extension pour la contrainte d'exclusion (anti-chevauchement)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Création des tables

-- Table des profils (liée à auth.users de Supabase)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'admin')) DEFAULT 'client',
    nom TEXT,
    prenom TEXT,
    telephone TEXT,
    adresse TEXT
);

-- Table des chambres
CREATE TABLE chambres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_chambre TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    prix_par_nuit NUMERIC NOT NULL CHECK (prix_par_nuit > 0),
    capacite INT NOT NULL CHECK (capacite > 0),
    statut TEXT NOT NULL CHECK (statut IN ('disponible', 'occupee', 'hors_service')) DEFAULT 'disponible'
);

-- Table des réservations
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_client UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    id_chambre UUID NOT NULL REFERENCES chambres(id) ON DELETE RESTRICT,
    date_reservation TIMESTAMP WITH TIME ZONE DEFAULT now(),
    date_arrivee DATE NOT NULL,
    date_depart DATE NOT NULL,
    statut TEXT NOT NULL CHECK (statut IN ('confirmee', 'annulee', 'en_attente')) DEFAULT 'en_attente',
    
    -- Contraintes : date de départ après date d'arrivée
    CONSTRAINT check_dates CHECK (date_depart > date_arrivee),
    
    -- Contrainte d'exclusion : anti-chevauchement (une chambre ne peut pas être réservée 2 fois sur les mêmes dates)
    -- On exclut les statuts 'annulee' pour permettre la réservation d'une chambre si l'ancienne réservation est annulée.
    EXCLUDE USING gist (
        id_chambre WITH =,
        daterange(date_arrivee, date_depart, '[)') WITH &&
    ) WHERE (statut != 'annulee')
);

-- Table des séjours
CREATE TABLE sejours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reservation UUID REFERENCES reservations(id) ON DELETE SET NULL,
    id_client UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    id_chambre UUID NOT NULL REFERENCES chambres(id) ON DELETE RESTRICT,
    date_arrivee DATE NOT NULL,
    date_depart DATE,
    montant_total NUMERIC CHECK (montant_total >= 0)
);

-- Table des factures
CREATE TABLE factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_facture TEXT UNIQUE NOT NULL,
    id_sejour UUID NOT NULL REFERENCES sejours(id) ON DELETE CASCADE,
    date_facture TIMESTAMP WITH TIME ZONE DEFAULT now(),
    montant_total NUMERIC NOT NULL CHECK (montant_total >= 0),
    statut TEXT NOT NULL CHECK (statut IN ('payee', 'partiellement_payee', 'impayee')) DEFAULT 'impayee'
);

-- Table des paiements (simulation)
CREATE TABLE paiements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_facture UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT now(),
    montant NUMERIC NOT NULL CHECK (montant > 0),
    mode_paiement TEXT NOT NULL,
    statut TEXT NOT NULL CHECK (statut IN ('effectue', 'partiel', 'en_attente')) DEFAULT 'effectue'
);

-- ==========================================
-- 2. Sécurité RLS (Row Level Security)
-- ==========================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambres ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sejours ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- Fonctions utilitaires
-- ------------------------------------------
-- Fonction pour vérifier si l'utilisateur actuel est admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------
-- Politiques RLS (Policies)
-- ------------------------------------------

-- PROFILES
-- Les clients peuvent lire/modifier leur propre profil. L'admin voit et modifie tout le monde.
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Les utilisateurs peuvent modifier leur profil" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Les utilisateurs peuvent insérer leur propre profil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());
CREATE POLICY "Les admins peuvent supprimer des profils" ON profiles FOR DELETE USING (is_admin());

-- CHAMBRES
-- Tout le monde peut voir les chambres. Seul l'admin peut modifier (ajouter, mettre à jour, supprimer).
CREATE POLICY "Tout le monde peut voir les chambres" ON chambres FOR SELECT USING (true);
CREATE POLICY "Seul l'admin peut modifier les chambres" ON chambres FOR ALL USING (is_admin());

-- RESERVATIONS
-- Les clients voient et gèrent leurs réservations. Admin fait tout.
CREATE POLICY "Les clients voient leurs réservations" ON reservations FOR SELECT USING (auth.uid() = id_client OR is_admin());
CREATE POLICY "Les clients peuvent créer leurs réservations" ON reservations FOR INSERT WITH CHECK (auth.uid() = id_client OR is_admin());
CREATE POLICY "Les clients peuvent modifier/annuler leurs réservations" ON reservations FOR UPDATE USING (auth.uid() = id_client OR is_admin());
CREATE POLICY "Seul l'admin peut supprimer physiquement les réservations" ON reservations FOR DELETE USING (is_admin());

-- SEJOURS
-- Idem : client voit ses propres séjours, admin gère tout.
CREATE POLICY "Les clients voient leurs séjours" ON sejours FOR SELECT USING (auth.uid() = id_client OR is_admin());
CREATE POLICY "Seul l'admin peut gérer les séjours" ON sejours FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Seul l'admin peut modifier les séjours" ON sejours FOR UPDATE USING (is_admin());
CREATE POLICY "Seul l'admin peut supprimer les séjours" ON sejours FOR DELETE USING (is_admin());

-- FACTURES
-- Client voit ses factures, admin gère.
CREATE POLICY "Les clients voient leurs factures" ON factures FOR SELECT USING (
    EXISTS (SELECT 1 FROM sejours WHERE sejours.id = factures.id_sejour AND (sejours.id_client = auth.uid() OR is_admin()))
);
CREATE POLICY "Seul l'admin gère les factures" ON factures FOR ALL USING (is_admin());

-- PAIEMENTS
-- Client voit ses paiements et peut (en simulation) insérer un paiement pour ses factures. Admin gère.
CREATE POLICY "Les clients voient leurs paiements" ON paiements FOR SELECT USING (
    EXISTS (SELECT 1 FROM factures JOIN sejours ON factures.id_sejour = sejours.id WHERE factures.id = paiements.id_facture AND (sejours.id_client = auth.uid() OR is_admin()))
);
CREATE POLICY "Les clients peuvent simuler un paiement" ON paiements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM factures JOIN sejours ON factures.id_sejour = sejours.id WHERE factures.id = paiements.id_facture AND (sejours.id_client = auth.uid() OR is_admin()))
);
CREATE POLICY "Seul l'admin gère les paiements (update/delete)" ON paiements FOR UPDATE USING (is_admin());
CREATE POLICY "Seul l'admin peut supprimer des paiements" ON paiements FOR DELETE USING (is_admin());
