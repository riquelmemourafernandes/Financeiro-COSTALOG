import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DSS_ENDPOINTS: Record<string, string> = {
  listarContasReceber: "listarContasReceber",
  listarContasPagar: "listarContasPagar",
};
const ALLOWED_REFERENCES = new Set(["E", "V", "P"]);
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const SESSION_TTL_SECONDS = 8 * 60 * 60;

function accessToken(password: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", password)
    .update(`finance-costalog-session-v1:${issuedAt}`)
    .digest("hex");
  return `${issuedAt}.${signature}`;
}

function isValidAccessToken(token: string, password: string): boolean {
  const [issuedAtText, signature] = token.split(".");
  const issuedAt = Number(issuedAtText);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(issuedAt) || !signature || issuedAt > now || now - issuedAt > SESSION_TTL_SECONDS) {
    return false;
  }
  const expected = createHmac("sha256", password)
    .update(`finance-costalog-session-v1:${issuedAt}`)
    .digest("hex");
  return safeEqual(signature, expected);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hasValidFinancePassword(req: express.Request): boolean {
  const expected = process.env.FINANCE_ACCESS_PASSWORD;
  if (!expected) return false;
  const supplied = req.header("x-finance-password") || "";
  if (supplied && safeEqual(supplied, expected)) return true;
  const cookie = (req.headers.cookie || "").split(";").map(part => part.trim()).find(part => part.startsWith("finance_access="));
  const token = cookie?.slice("finance_access=".length) || "";
  return !!token && isValidAccessToken(token, expected);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));

  // User-defined DRE classifications are stored in SQLite. On Render, set
  // CLASSIFICATION_DB_PATH to a mounted persistent-disk path (for example /var/data/classifications.sqlite).
  const classificationDbPath = process.env.CLASSIFICATION_DB_PATH || "./data/classifications.sqlite";
  fs.mkdirSync(path.dirname(path.resolve(classificationDbPath)), { recursive: true });
  const classificationDb = new Database(classificationDbPath);
  classificationDb.pragma("journal_mode = WAL");
  classificationDb.exec(`
    CREATE TABLE IF NOT EXISTS dre_classifications (
      label_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const listClassifications = classificationDb.prepare(
    "SELECT label, category, subcategory FROM dre_classifications ORDER BY label COLLATE NOCASE"
  );
  const saveClassification = classificationDb.prepare(`
    INSERT INTO dre_classifications (label_key, label, category, subcategory, updated_at)
    VALUES (@label_key, @label, @category, @subcategory, CURRENT_TIMESTAMP)
    ON CONFLICT(label_key) DO UPDATE SET
      label = excluded.label,
      category = excluded.category,
      subcategory = excluded.subcategory,
      updated_at = CURRENT_TIMESTAMP
  `);

  app.get("/api/health", (_req, res) => {
    return res.json({ status: "ok", service: "financeiro-costalog" });
  });

  // Fail closed: financial endpoints never work until an access password is configured.
  app.get("/api/financeiro/auth", (req, res) => {
    if (!process.env.FINANCE_ACCESS_PASSWORD) {
      return res.status(503).json({ error: "A senha de acesso financeiro não está configurada no servidor." });
    }
    if (!hasValidFinancePassword(req) || !(req.headers.cookie || "").includes("finance_access=")) {
      return res.status(401).json({ error: "Acesso não autorizado." });
    }
    return res.json({ authenticated: true });
  });

  app.post("/api/financeiro/logout", (_req, res) => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `finance_access=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
    return res.json({ authenticated: false });
  });

  app.post("/api/financeiro/auth", (req, res) => {
    if (!process.env.FINANCE_ACCESS_PASSWORD) {
      return res.status(503).json({ error: "A senha de acesso financeiro não está configurada no servidor." });
    }
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." });
    }

    const expected = process.env.FINANCE_ACCESS_PASSWORD;
    const supplied = req.header("x-finance-password") || "";
    if (!expected || !supplied || !safeEqual(supplied, expected)) {
      const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      current.count += 1;
      loginAttempts.set(ip, current);
      return res.status(401).json({ error: "Acesso não autorizado." });
    }

    loginAttempts.delete(ip);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `finance_access=${accessToken(expected)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`);
    return res.json({ authenticated: true });
  });

  app.get("/api/financeiro/classificacoes", (req, res) => {
    if (!hasValidFinancePassword(req)) {
      return res.status(process.env.FINANCE_ACCESS_PASSWORD ? 401 : 503).json({ error: "Acesso não autorizado." });
    }
    const mappings: Record<string, { category: string; subcategory: string }> = {};
    for (const row of listClassifications.all() as Array<{label:string;category:string;subcategory:string}>) {
      mappings[row.label] = { category: row.category, subcategory: row.subcategory };
    }
    return res.json({ mappings });
  });

  app.put("/api/financeiro/classificacoes", (req, res) => {
    if (!hasValidFinancePassword(req)) {
      return res.status(process.env.FINANCE_ACCESS_PASSWORD ? 401 : 503).json({ error: "Acesso não autorizado." });
    }
    const { label, category, subcategory } = req.body ?? {};
    if ([label, category, subcategory].some(value => typeof value !== "string" || !value.trim() || value.length > 200)) {
      return res.status(400).json({ error: "Informe categoria original, categoria DRE e subcategoria válidas." });
    }
    const normalizedLabel = label.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\s+/g, " ").trim().toUpperCase();
    saveClassification.run({
      label_key: normalizedLabel,
      label: label.trim(),
      category: category.trim(),
      subcategory: subcategory.trim()
    });
    return res.json({ saved: true, label: label.trim(), category: category.trim(), subcategory: subcategory.trim() });
  });

  app.post("/api/financeiro/dss", async (req, res) => {
    if (!hasValidFinancePassword(req)) {
      return res.status(process.env.FINANCE_ACCESS_PASSWORD ? 401 : 503).json({
        error: process.env.FINANCE_ACCESS_PASSWORD ? "Acesso não autorizado." : "A senha de acesso financeiro não está configurada no servidor."
      });
    }
    try {
      const { endpoint, params } = req.body ?? {};
      const route = typeof endpoint === "string" ? DSS_ENDPOINTS[endpoint] : undefined;
      if (!route) return res.status(400).json({ error: "Endpoint DSS não permitido." });

      const { DSS_BASE_URL, DSS_USER, DSS_PASSWORD, DSS_DATABASE } = process.env;
      if (!DSS_BASE_URL || !DSS_USER || !DSS_PASSWORD || !DSS_DATABASE) {
        return res.status(503).json({ error: "Integração DSS não configurada no backend." });
      }

      const base = new URL(DSS_BASE_URL);
      const allowedHost = base.hostname === "dssinformatica.com.br" || base.hostname.endsWith(".dssinformatica.com.br");
      if (base.protocol !== "https:" || !allowedHost || base.username || base.password) {
        return res.status(500).json({ error: "DSS_BASE_URL deve ser HTTPS e apontar para um domínio DSS autorizado." });
      }

      const input = params && typeof params === "object" ? params : {};
      const start = typeof input.data_inicio === "string" ? input.data_inicio : "";
      const end = typeof input.data_fim === "string" ? input.data_fim : "";
      const reference = typeof input.tipo_ref === "string" ? input.tipo_ref : "E";
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(start) || !/^\d{2}\/\d{2}\/\d{4}$/.test(end)) {
        return res.status(400).json({ error: "Informe data_inicio e data_fim no formato DD/MM/AAAA." });
      }
      if (!ALLOWED_REFERENCES.has(reference)) {
        return res.status(400).json({ error: "tipo_ref deve ser E, V ou P." });
      }

      // Preserve a configured path such as /wsdss/ when resolving the allowed endpoint.
      if (!base.pathname.endsWith("/")) base.pathname += "/";
      const target = new URL(route, base);
      target.searchParams.set("nome_banco_dados", DSS_DATABASE);
      target.searchParams.set("banco", DSS_DATABASE);
      target.searchParams.set("usuario", DSS_USER);
      target.searchParams.set("senha", DSS_PASSWORD);
      target.searchParams.set("data_inicio", start);
      target.searchParams.set("data_fim", end);
      target.searchParams.set("tipo_ref", reference);

      const upstream = await fetch(target.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        timeout: 30000,
      } as any);
      const body = await upstream.text();
      let data: any;
      try { data = JSON.parse(body); }
      catch { return res.status(502).json({ error: "O DSS retornou uma resposta que não é JSON válido." }); }

      if (!upstream.ok) return res.status(502).json({ error: "Erro na consulta ao DSS.", status: upstream.status });
      if (typeof data?.mensagemErro === "string" && data.mensagemErro.trim()) {
        return res.status(502).json({ error: "O DSS informou um erro na consulta.", details: data.mensagemErro });
      }
      return res.json(data);
    } catch (error: any) {
      console.error("[DSS] Falha na consulta:", error?.message || "erro desconhecido");
      return res.status(502).json({ error: "Não foi possível consultar o DSS." });
    }
  });

  app.post("/api/proxy", (_req, res) => res.status(410).json({ error: "Proxy antigo desativado. Use /api/financeiro/dss." }));
  app.get("/api/proxy", (_req, res) => res.status(410).json({ error: "Proxy antigo desativado. Use /api/financeiro/dss." }));
  app.post("/api/proxy/clear", (_req, res) => res.json({ status: "ok", message: "Não há cache de proxy para limpar." }));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => res.sendFile("dist/index.html", { root: "." }));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
