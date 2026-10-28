// WINON CAR - Cloudflare Pages Function: /api/admin/users
// Gestion des administrateurs (Réservé exclusivement aux Super Administrateurs)

import { validatePasswordPolicy, hashPassword } from '../auth/_crypto.js';

const VALID_ROLES = ['admin', 'superadmin'];
const VALID_STATUSES = ['actif', 'desactive', 'inactif'];

/**
 * GET /api/admin/users
 * Liste l'ensemble des administrateurs (sans jamais exposer les hashs de mot de passe)
 */
export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  // Contrôle strict RBAC : Seul le Super Admin peut consulter la liste des comptes
  if (!user || user.role !== 'superadmin') {
    return new Response(JSON.stringify({
      success: false,
      error: "Accès refusé : privilèges Super Administrateur requis."
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT 
        id,
        username,
        email,
        role,
        full_name AS fullName,
        status,
        created_at AS createdAt,
        last_login AS lastLogin
      FROM users
      ORDER BY id ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      users: result.results || [],
      count: (result.results || []).length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur lors de la récupération des utilisateurs."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/admin/users
 * Crée un nouvel administrateur avec politique de mot de passe stricte et hachage PBKDF2
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = context.data?.user;

  // Contrôle strict RBAC : Seul le Super Admin peut créer des comptes
  if (!user || user.role !== 'superadmin') {
    return new Response(JSON.stringify({
      success: false,
      error: "Accès refusé : privilèges Super Administrateur requis."
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ success: false, error: "Corps de requête invalide ou manquant." }), { status: 400 });
    }

    const { username, email, password, role, fullName } = body;

    // 1. Validation du nom d'utilisateur
    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,30}$/.test(username.trim())) {
      return new Response(JSON.stringify({
        success: false,
        error: "Nom d'utilisateur invalide (3 à 30 caractères alphanumériques, tirets et underscores autorisés)."
      }), { status: 400 });
    }
    const cleanUsername = username.trim();

    // 2. Validation de l'email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(JSON.stringify({
        success: false,
        error: "Format d'adresse email invalide."
      }), { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    // 3. Validation du rôle
    if (!role || !VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Rôle invalide. Rôles autorisés : ${VALID_ROLES.join(', ')}`
      }), { status: 400 });
    }

    // 4. Validation de la politique de mot de passe (>= 12 car, maj, min, num, sym)
    const policyResult = validatePasswordPolicy(password);
    if (!policyResult.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: policyResult.error
      }), { status: 400 });
    }

    // 5. Vérification des doublons (username ou email déjà existant)
    const existing = await env.DB.prepare(`
      SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1
    `).bind(cleanUsername, cleanEmail).first();

    if (existing) {
      return new Response(JSON.stringify({
        success: false,
        error: "Un compte avec cet identifiant ou cette adresse email existe déjà."
      }), { status: 409 });
    }

    // 6. Hachage sécurisé PBKDF2-SHA256 (100k itérations, sel aléatoire 16 octets)
    const passwordHash = await hashPassword(password);
    const cleanFullName = typeof fullName === 'string' ? fullName.trim() : '';

    // 7. Insertion de l'utilisateur
    const insertResult = await env.DB.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'actif', datetime('now'))
    `).bind(cleanUsername, cleanEmail, passwordHash, role, cleanFullName).run();

    const newUserId = insertResult.meta?.last_row_id || null;

    // 8. Enregistrement immuable dans le journal d'audit
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
    const auditDetails = JSON.stringify({
      createdUsername: cleanUsername,
      createdEmail: cleanEmail,
      assignedRole: role,
      fullName: cleanFullName
    });

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, 'USER_CREATED', 'user', ?, ?, ?)
      `).bind(user.id, user.username, user.role, String(newUserId || cleanUsername), auditDetails, clientIp).run();
    } catch (auditErr) {
      console.warn("Échec d'insertion audit log :", auditErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Compte administrateur '${cleanUsername}' créé avec succès.`,
      user: {
        id: newUserId,
        username: cleanUsername,
        email: cleanEmail,
        role: role,
        fullName: cleanFullName,
        status: 'actif'
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la création de l'administrateur."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PATCH /api/admin/users
 * Modifie le rôle ou le statut d'un administrateur avec protection contre l'auto-blocage
 */
export async function onRequestPatch(context) {
  const { request, env } = context;
  const user = context.data?.user;

  // Contrôle strict RBAC : Seul le Super Admin peut modifier des comptes
  if (!user || user.role !== 'superadmin') {
    return new Response(JSON.stringify({
      success: false,
      error: "Accès refusé : privilèges Super Administrateur requis."
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return new Response(JSON.stringify({ success: false, error: "ID d'utilisateur requis." }), { status: 400 });
    }

    const targetId = Number(body.id);
    const newRole = body.role ? String(body.role) : null;
    const newStatus = body.status ? String(body.status) : null;

    // Récupération de l'utilisateur cible
    const targetUser = await env.DB.prepare(`
      SELECT id, username, email, role, status FROM users WHERE id = ?
    `).bind(targetId).first();

    if (!targetUser) {
      return new Response(JSON.stringify({ success: false, error: "Utilisateur introuvable." }), { status: 404 });
    }

    // Protection anti-auto-blocage : un Super Admin ne peut pas désactiver ou rétrograder son propre compte
    if (targetUser.id === user.id) {
      if (newStatus && newStatus !== 'actif') {
        return new Response(JSON.stringify({
          success: false,
          error: "Action interdite : vous ne pouvez pas désactiver votre propre compte Super Administrateur."
        }), { status: 400 });
      }
      if (newRole && newRole !== 'superadmin') {
        return new Response(JSON.stringify({
          success: false,
          error: "Action interdite : vous ne pouvez pas rétrograder votre propre rôle Super Administrateur."
        }), { status: 400 });
      }
    }

    // Validations
    if (newRole && !VALID_ROLES.includes(newRole)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Rôle invalide. Rôles autorisés : ${VALID_ROLES.join(', ')}`
      }), { status: 400 });
    }

    if (newStatus && !VALID_STATUSES.includes(newStatus)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Statut invalide. Statuts autorisés : ${VALID_STATUSES.join(', ')}`
      }), { status: 400 });
    }

    const updates = [];
    const updateParams = [];

    const normalizedStatus = (newStatus === 'inactif') ? 'desactive' : newStatus;

    if (newRole && newRole !== targetUser.role) {
      updates.push('role = ?');
      updateParams.push(newRole);
    }
    if (normalizedStatus && normalizedStatus !== targetUser.status) {
      updates.push('status = ?');
      updateParams.push(normalizedStatus);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Aucune modification nécessaire." }), { status: 200 });
    }

    updateParams.push(targetId);
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...updateParams).run();

    // Si le compte est désactivé, révoquer immédiatement toutes ses sessions actives
    if (normalizedStatus === 'desactive') {
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId).run();
    }

    // Enregistrement dans le journal d'audit
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
    const auditDetails = JSON.stringify({
      targetUsername: targetUser.username,
      previousRole: targetUser.role,
      newRole: newRole || targetUser.role,
      previousStatus: targetUser.status,
      newStatus: newStatus || targetUser.status
    });

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, 'USER_UPDATED', 'user', ?, ?, ?)
      `).bind(user.id, user.username, user.role, String(targetId), auditDetails, clientIp).run();
    } catch (auditErr) {
      console.warn("Échec d'insertion audit log :", auditErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Compte '${targetUser.username}' mis à jour avec succès.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la mise à jour."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
