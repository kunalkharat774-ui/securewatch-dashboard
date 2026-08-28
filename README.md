# SecureWatch Dashboard

## URL Reputation

For real PhishGuard verdicts, add the API key to `.env.local`:

```env
PHISHGUARD_API_KEY=your_phishguard_api_key
```

The backend sends every entered URL to `https://phishguard.in/api/analyze-url` and displays the returned Safe, Suspicious, or Malicious result. Never commit `.env.local` or the API key.
# SecureWatch - Web Application & API Security Dashboard

## Deploy On Vercel

1. Import this repository into Vercel. The included `vercel.json` builds the Vite frontend and routes `/api/*` to the Node.js API function.
2. Add the server-side variables in `.env.example` under **Project Settings > Environment Variables**. At minimum, set `SECUREWATCH_MASTER_PASSCODE` before using the admin endpoints.
3. Add `GEMINI_API_KEY`, `PHISHGUARD_API_KEY`, `ISMALICIOUS_API_KEY`, and `PROJECTDISCOVERY_API_KEY` only when those integrations are needed. Keep these variables server-only; do not use the `VITE_` prefix for secrets.
4. In Supabase, copy the pooled connection string from **Project Settings > Database > Connection pooling** and add it in Vercel as the server-only `POSTGRES_URL` variable. You can also set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` when available. The API automatically creates its `securewatch_tenants` and `ip_chat_messages` tables on first use.
5. The tenant store persists users, SIEM logs, URL scan history, file activity history, and IP chat messages. Keep `VITE_SUPABASE_ANON_KEY` limited to the browser; never expose database passwords, service-role keys, JWT secrets, or pooled URLs with a `VITE_` prefix.

The production build command is `npm run build`, and the generated output directory is `dist`.

SecureWatch is a modern, real-time cyber threat monitoring and security analysis platform designed to help security analysts track vulnerabilities, monitor live network traffic, check URL reputations, and secure sensitive files.

<p align="center">
  <h3 align="center">🌐 Live Global Cyber Threat Intelligence</h3>
</p>

<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW9iN2h6MnEyd3RpbTd2YXJzMDg0eGlmdDFlNXp3ZTBhZm5yOHM4aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/37QUVx5Og5KB49ZnfF/giphy.gif" width="300" alt="GIF Description">
</p>

## 🚀 Features

* **Real-Time Threat Monitoring:** Track total requests, active threats, overall vulnerabilities, and dynamic risk scores in real time.
* **Live 3D Cyber Attack Map:** Visual representation of global cyber attacks, tracking total attacks, successful breaches, blocked threats, and ongoing incidents.
* **URL Reputation Checker:** Instantly scan URLs to determine if they are safe, suspicious, or malicious, along with detailed domain, IP, and blacklist status checks.
* **File Security (Encryption & Decryption):** Securely upload, encrypt, and password-protect sensitive files, or decrypt them using a secure password interface.
* **Vulnerability & Risk Assessment:** Access modules like OWASP Top 10, Risk Assessment, Email Breach Checker, Password Strength tools, and IP/Domain Lookups.
* **Activity & Log Management:** Real-time logging of recent URL scans and file activities with instant status tracking (Success, Blocked, Caution).

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript / Modern Frontend Framework (React.js / Vue.js)
* **Styling:** Tailwind CSS / Custom CSS with Dark Mode Dashboard Theme
* **Icons & Visuals:** Chart.js / D3.js (for maps and graphs)

---

## 📦 Getting Started

### Prerequisites
Make sure you have **Node.js** and **npm** installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/kunalkharat774-ui/securewatch-dashboard.git](https://github.com/kunalkharat774-ui/securewatch-dashboard.git)
