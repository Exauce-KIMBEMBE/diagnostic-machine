import { useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";

export default function Login({
  onLogin,
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  //====================================================
  // CONNEXION
  //====================================================

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Veuillez saisir votre adresse e-mail."
      );

      return;
    }

    if (!password) {
      setError(
        "Veuillez saisir votre mot de passe."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/api/auth/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                normalizedEmail,

              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Impossible de se connecter."
        );
      }

      if (!data?.token) {
        throw new Error(
          "Le serveur n'a pas retourné de jeton de connexion."
        );
      }

      if (
        typeof onLogin ===
        "function"
      ) {
        onLogin(data);
      }
    } catch (error) {
      console.error(
        "Erreur de connexion :",
        error
      );

      setError(
        error?.message ||
          "Une erreur est survenue pendant la connexion."
      );
    } finally {
      setLoading(false);
    }
  }

  //====================================================
  // AFFICHAGE
  //====================================================

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Activity size={30} />
          </div>

          <div>
            <h1>
              Diagnostic Machine
            </h1>

            <p>
              Plateforme de surveillance
              industrielle
            </p>
          </div>
        </div>

        <div className="login-header">
          <h2>Connexion</h2>

          <p>
            Connectez-vous pour accéder
            à vos machines.
          </p>
        </div>

        {error && (
          <div
            className="login-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="login-form"
          onSubmit={
            handleSubmit
          }
        >
          <div className="login-field">
            <label
              htmlFor="login-email"
            >
              Adresse e-mail
            </label>

            <div className="login-input-wrapper">
              <Mail
                size={19}
                className="login-input-icon"
              />

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                placeholder="exemple@email.com"
                autoComplete="email"
                disabled={
                  loading
                }
              />
            </div>
          </div>

          <div className="login-field">
            <label
              htmlFor="login-password"
            >
              Mot de passe
            </label>

            <div className="login-input-wrapper">
              <Lock
                size={19}
                className="login-input-icon"
              />

              <input
                id="login-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                disabled={
                  loading
                }
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                disabled={
                  loading
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={19}
                  />
                ) : (
                  <Eye
                    size={19}
                  />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={
              loading
            }
          >
            {loading
              ? "Connexion..."
              : "Se connecter"}
          </button>
        </form>

        <div className="login-footer">
          <span>
            Système de diagnostic
            et de surveillance
          </span>
        </div>
      </div>
    </div>
  );
}
