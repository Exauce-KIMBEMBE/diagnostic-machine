import { useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  Lock,
  Mail,
  User,
  Cpu,
} from "lucide-react";

export default function Register({
  onRegister,
  onBackToLogin,
}) {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [machineId, setMachineId] =
    useState("");

  const [
    serialNumber,
    setSerialNumber,
  ] = useState("");

  const [
    activationCode,
    setActivationCode,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedSerial =
      serialNumber.trim();

    const normalizedActivationCode =
      activationCode
        .trim()
        .toUpperCase();

    const parsedMachineId =
      Number(machineId);

    if (!normalizedName) {
      setError(
        "Veuillez saisir votre nom."
      );

      return;
    }

    if (!normalizedEmail) {
      setError(
        "Veuillez saisir votre adresse e-mail."
      );

      return;
    }

    if (
      !password ||
      password.length < 8
    ) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Les mots de passe ne correspondent pas."
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedMachineId
      ) ||
      parsedMachineId <= 0
    ) {
      setError(
        "L'identifiant de la machine est invalide."
      );

      return;
    }

    if (!normalizedSerial) {
      setError(
        "Veuillez saisir le numéro de série de la machine."
      );

      return;
    }

    if (
      !normalizedActivationCode
    ) {
      setError(
        "Veuillez saisir le code d'activation de la machine."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/api/auth/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                normalizedName,

              email:
                normalizedEmail,

              password,

              machineId:
                parsedMachineId,

              serialNumber:
                normalizedSerial,

              activationCode:
                normalizedActivationCode,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Impossible de créer le compte."
        );
      }

      if (!data?.token) {
        throw new Error(
          "Le serveur n'a pas retourné de jeton de connexion."
        );
      }

      if (
        typeof onRegister ===
        "function"
      ) {
        onRegister(data);
      }
    } catch (error) {
      console.error(
        "Erreur d'inscription :",
        error
      );

      setError(
        error?.message ||
          "Une erreur est survenue pendant la création du compte."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card register-card">
        <div className="login-brand">
          <div className="login-logo">
            <Activity size={30} />
          </div>

          <div>
            <h1>
              Diagnostic Machine
            </h1>

            <p>
              Création d'un compte
              utilisateur
            </p>
          </div>
        </div>

        <div className="login-header">
          <h2>
            Créer un compte
          </h2>

          <p>
            Enregistrez votre compte et
            associez votre première machine.
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
            <label htmlFor="register-name">
              Nom
            </label>

            <div className="login-input-wrapper">
              <User
                size={19}
                className="login-input-icon"
              />

              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(
                  event
                ) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Votre nom"
                autoComplete="name"
                disabled={
                  loading
                }
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="register-email">
              Adresse e-mail
            </label>

            <div className="login-input-wrapper">
              <Mail
                size={19}
                className="login-input-icon"
              />

              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
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
            <label htmlFor="register-password">
              Mot de passe
            </label>

            <div className="login-input-wrapper">
              <Lock
                size={19}
                className="login-input-icon"
              />

              <input
                id="register-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                disabled={
                  loading
                }
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                disabled={
                  loading
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="register-confirm-password">
              Confirmer le mot de passe
            </label>

            <div className="login-input-wrapper">
              <Lock
                size={19}
                className="login-input-icon"
              />

              <input
                id="register-confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirmez votre mot de passe"
                autoComplete="new-password"
                disabled={
                  loading
                }
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }
                disabled={
                  loading
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <div className="register-machine-section">
            <div className="register-machine-title">
              <Cpu size={18} />

              <div>
                <strong>
                  Première machine
                </strong>

                <span>
                  Informations fournies avec la machine
                </span>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="register-machine-id">
                ID de la machine
              </label>

              <div className="login-input-wrapper">
                <Hash
                  size={19}
                  className="login-input-icon"
                />

                <input
                  id="register-machine-id"
                  type="number"
                  min="1"
                  value={
                    machineId
                  }
                  onChange={(
                    event
                  ) =>
                    setMachineId(
                      event.target.value
                    )
                  }
                  placeholder="Exemple : 1"
                  disabled={
                    loading
                  }
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="register-serial">
                Numéro de série
              </label>

              <div className="login-input-wrapper">
                <Cpu
                  size={19}
                  className="login-input-icon"
                />

                <input
                  id="register-serial"
                  type="text"
                  value={
                    serialNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setSerialNumber(
                      event.target.value
                    )
                  }
                  placeholder="Exemple : MACHINE-001"
                  disabled={
                    loading
                  }
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="register-activation-code">
                Code d'activation
              </label>

              <div className="login-input-wrapper">
                <KeyRound
                  size={19}
                  className="login-input-icon"
                />

                <input
                  id="register-activation-code"
                  type="text"
                  value={
                    activationCode
                  }
                  onChange={(
                    event
                  ) =>
                    setActivationCode(
                      event.target.value
                    )
                  }
                  placeholder="Exemple : A7F4C9D2B681"
                  autoComplete="off"
                  disabled={
                    loading
                  }
                />
              </div>
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
              ? "Création..."
              : "Créer mon compte"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            Vous avez déjà un compte ?
          </span>

          <button
            type="button"
            onClick={
              onBackToLogin
            }
            disabled={
              loading
            }
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
