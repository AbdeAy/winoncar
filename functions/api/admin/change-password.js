// WINON CAR - Cloudflare Pages Function: /api/admin/change-password
// Modification sécurisée des identifiants / mots de passe des administrateurs
// Requiert une session active (gérée par _middleware.js)

import {
  validatePasswordPolicy,
  hashPassword,
  verifyPassword
} from '../auth/_crypto.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const caller = context.data?.user;

  if (!caller) {
    return new Response(JSON.stringify({
      success: false,
      error: "Accès refusé : session non authentifiée."
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({
      success: false,
      error: "Base de données indisponible."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({
        success: false,
        error: "Corps de requête invalide ou manquant."
      }), { status: 400 });
    }

    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword.trim() : '';
    const targetUserId = body.targetUserId ? Number(body.targetUserId) : caller.id;

    // 1. Contrôles des champs obligatoires
    if (!currentPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "Veuillez saisir votre mot de passe actuel."
      }), { status: 400 });
    }

    if (!newPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "Veuillez saisir un nouveau mot de passe."
      }), { status: 400 });
    }

    if (!confirmPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "Veuillez confirmer le nouveau mot de passe."
      }), { status: 400 });
    }

    // 2. Vérification de la correspondance entre le nouveau mot de passe et sa confirmation
    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "La confirmation ne correspond pas au nouveau mot de passe."
      }), { status: 400 });
    }

    // 3. Vérification de non-réutilisation du même mot de passe
    if (newPassword === currentPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "Le nouveau mot de passe doit être différent du mot de passe actuel."
      }), { status: 400 });
    }

    // 4. Contrôle strict de la politique de sécurité des mots de passe (12+ car, maj, min, num, sym)
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: policyResult.error
      }), { status: 400 });
    }

    // 5. Contrôle RBAC des privilèges pour targetUserId
    const isSelfChange = (targetUserId === caller.id);

    if (!isSelfChange && caller.role !== 'superadmin') {
      // Un admin standard ne peut JAMAIS modifier le mot de passe d'un autre utilisateur
      return new Response(JSON.stringify({
        success: false,
        error: "Action interdite : Seul le Super Administrateur peut modifier les identifiants d'un tiers."
      }), { status: 403 });
    }

    // 6. Récupération des informations de l'appelant pour vérifier son mot de passe actuel
    const callerRecord = await env.DB.prepare(`
      SELECT id, username, email, password_hash, role, status
      FROM users
      WHERE id = ?
    `).bind(caller.id).first();

    if (!callerRecord || callerRecord.status !== 'actif') {
      return new Response(JSON.stringify({
        success: false,
        error: "Compte administrateur introuvable ou inactif."
      }), { status: 403 });
    }

    // Vérification cryptographique stricte du mot de passe actuel de l'appelant
    const isCurrentValid = await verifyPassword(currentPassword, callerRecord.password_hash);
    if (!isCurrentValid) {
      // Audit de tentative échouée
      try {
        await env.DB.prepare(`
          INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address)
          VALUES (?, ?, ?, 'PASSWORD_CHANGE_FAILED', 'user', ?, '{"reason":"invalid_current_password"}', ?)
        `).bind(caller.id, caller.username, caller.role, String(targetUserId), clientIp).run();
      } catch (logErr) {
        console.warn("Échec écriture audit log :", logErr);
      }

      return new Response(JSON.stringify({
        success: false,
        error: "Le mot de passe actuel est incorrect."
      }), { status: 400 });
    }

    // 7. Récupération du compte cible si différent de l'appelant
    let targetRecord = callerRecord;
    if (!isSelfChange) {
      targetRecord = await env.DB.prepare(`
        SELECT id, username, email, role, status
        FROM users
        WHERE id = ?
      `).bind(targetUserId).first();

      if (!targetRecord) {
        return new Response(JSON.stringify({
          success: false,
          error: "Utilisateur cible introuvable."
        }), { status: 404 });
      }
    }

    // 8. Hachage sécurisé PBKDF2-SHA256 (100 000 itérations + sel aléatoire 16 octets)
    const newPasswordHash = await hashPassword(newPassword);

    // 9. Mise à jour atomique en base D1
    await env.DB.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
    `).bind(newPasswordHash, targetRecord.id).run();

    // 10. Enregistrement dans le journal d'audit administratif
    try {
      const auditDetails = JSON.stringify({
        targetUsername: targetRecord.username,
        targetRole: targetRecord.role,
        changedBy: caller.username,
        isSelfChange: isSelfChange
      });

      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, 'PASSWORD_CHANGED', 'user', ?, ?, ?)
      `).bind(caller.id, caller.username, caller.role, String(targetRecord.id), auditDetails, clientIp).run();
    } catch (logErr) {
      console.warn("Échec écriture audit log :", logErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: isSelfChange
        ? "Votre mot de passe a été modifié avec succès."
        : `Le mot de passe du compte '${targetRecord.username}' a été mis à jour avec succès.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la modification du mot de passe."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

