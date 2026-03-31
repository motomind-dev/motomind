"use client";

import { useState } from "react";

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

export default function ProfileForms({ initialUser }: { initialUser: UserProfile }) {
  const [user, setUser] = useState(initialUser);
  const [email, setEmail] = useState(initialUser.email);

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setEmailLoading(false);
    if (res.ok) {
      setEmailMsg({ type: "success", text: "Email mis à jour." });
      setUser((u) => (u ? { ...u, email } : u));
      setTimeout(() => setEmailMsg(null), 3000);
    } else {
      setEmailMsg({ type: "error", text: data.error || "Erreur lors de la mise à jour." });
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg(null);
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPasswordLoading(false);
    if (res.ok) {
      setPasswordMsg({ type: "success", text: "Mot de passe mis à jour." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(null), 3000);
    } else {
      setPasswordMsg({ type: "error", text: data.error || "Erreur lors de la mise à jour." });
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Informations du compte</h2>
        <dl className="space-y-2">
          {user.name && (
            <div>
              <dt className="text-sm text-zinc-500">Nom</dt>
              <dd className="text-white">{user.name}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-zinc-500">Email</dt>
            <dd className="text-white">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Compte créé le</dt>
            <dd className="text-white">
              {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-4 pt-4 border-t border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Modifier l&apos;email</h2>
        {emailMsg && (
          <div
            className={`p-3 rounded-lg text-sm ${
              emailMsg.type === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {emailMsg.text}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">
            Nouvel email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            placeholder="vous@exemple.com"
          />
        </div>
        <button
          type="submit"
          disabled={emailLoading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {emailLoading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4 border-t border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Changer le mot de passe</h2>
        {passwordMsg && (
          <div
            className={`p-3 rounded-lg text-sm ${
              passwordMsg.type === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {passwordMsg.text}
          </div>
        )}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-400 mb-1">
            Mot de passe actuel
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-400 mb-1">
            Nouveau mot de passe
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-400 mb-1">
            Confirmer le nouveau mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={passwordLoading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {passwordLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </div>
  );
}
