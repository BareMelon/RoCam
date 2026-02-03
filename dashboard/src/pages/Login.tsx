import { IconGoogle, IconDiscord, IconRoblox } from "../components/Icons";

const providers = [
  { id: "roblox", label: "Roblox", icon: IconRoblox },
  { id: "google", label: "Google", icon: IconGoogle },
  { id: "discord", label: "Discord", icon: IconDiscord },
] as const;

export const LoginPage = () => (
  <section className="card login-card">
    <h1>Sign in</h1>
    <p>Use your Roblox, Google, or Discord account to access the dashboard.</p>
    <div className="login-buttons">
      {providers.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className="btn-login-oauth" data-provider={id}>
          <span className="btn-login-oauth-icon">
            <Icon />
          </span>
          <span className="btn-login-oauth-label">{label}</span>
        </button>
      ))}
    </div>
  </section>
);
