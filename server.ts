import express from "express";
import { timingSafeEqual } from "node:crypto";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

const DSS_ENDPOINTS: Record<string, string> = {
  listarContasReceber: "listarContasReceber",
  listarContasPagar: "listarContasPagar",
};
const ALLOWED_REFERENCES = new Set(["E", "V", "P"]);

function hasValidFinancePassword(req: express.Request): boolean {
  const expected = process.env.FINANCE_ACCESS_PASSWORD;
  const supplied = req.header("x-finance-password") || "";
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  // Fail closed: financial endpoints never work until an access password is configured.
  app.post("/api/financeiro/auth", (req, res) => {
    if (!process.env.FINANCE_ACCESS_PASSWORD) {
      return res.status(503).json({ error: "A senha de acesso financeiro não está configurada no servidor." });
    }
    if (!hasValidFinancePassword(req)) {
      return res.status(401).json({ error: "Acesso não autorizado." });
    }
    return res.json({ authenticated: true });
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
