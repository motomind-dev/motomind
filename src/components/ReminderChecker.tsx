"use client";

import { useEffect } from "react";

/**
 * Déclenche la vérification des rappels au chargement du tableau de bord.
 */
export default function ReminderChecker() {
  useEffect(() => {
    fetch("/api/reminders/check").catch(() => {});
  }, []);
  return null;
}
