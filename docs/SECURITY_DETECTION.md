# Détection d'activités suspectes

## Stratégie

- Détection, journalisation et notification par email
- Pas de blocage agressif
- Anti-spam : pas d'envoi du même type d'alerte plus d'une fois par heure pour un utilisateur

## Événements détectés

| Type | Déclencheur | Alerte email |
|------|-------------|--------------|
| NEW_DEVICE_LOGIN | Connexion depuis un appareil jamais vu (90 jours) | Oui |
| NEW_IP_LOGIN | Connexion depuis une IP jamais vue | Oui |
| MULTIPLE_FAILED_LOGINS | 5+ échecs de connexion en 15 min | Oui (si compte existe) |
| MULTIPLE_RESET_REQUESTS | 3+ demandes de reset en 1 h | Oui |
| PASSWORD_CHANGED | Mot de passe modifié (profil ou reset) | Oui |

## Fichiers

- `src/lib/security/request-context.ts` — IP, user-agent, fingerprint
- `src/lib/security/security-events.ts` — Création d'événements, KnownDevice
- `src/lib/security/detect-suspicious-activity.ts` — Orchestration
- `src/lib/email.ts` — sendNewLoginAlertEmail, sendFailedLoginsAlertEmail, etc.
- `src/app/api/security/events/route.ts` — Liste des événements
- `src/app/(dashboard)/security/page.tsx` — Page "Sécurité du compte"

## Variables d'environnement

Aucune nouvelle variable. Utilise `RESEND_API_KEY` et `RESEND_FROM_EMAIL` existants.

## Commandes Prisma

```bash
npx prisma db push
npx prisma generate
```

## Checklist de tests

- [ ] Login depuis nouvel appareil → email "Nouvelle connexion détectée"
- [ ] 5 échecs de login sur un compte existant → email "Activité inhabituelle"
- [ ] 3 demandes de reset en 1 h → email "Demandes de réinitialisation répétées"
- [ ] Changement de mot de passe (profil) → email "Votre mot de passe a été modifié"
- [ ] Reset password réussi → email "Votre mot de passe a été modifié"
- [ ] Page /security affiche les événements
- [ ] Pas de spam : pas plusieurs alertes identiques en 1 h
