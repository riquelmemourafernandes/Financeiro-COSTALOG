import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

const DSS_ENDPOINTS: Record<string, string> = {
  listarContasReceber: "listarContasReceber",
  listarContasPagar: "listarContasPagar",
};
const ALLOWED_REFERENCES = new Set(["E", "V", "P"]);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  app.use(express.json({ limit: "32kb" }));

  // DSS credentials are server-side only. Never prefix them with VITE_.
  app.post("/api/financeiro/dss", async (req, res) => {
    try {
      const { endpoint, params } = req.body ?? {};
      const route = typeof endpoint === "string" ? DSS_ENDPOINTS[endpoint] : undefined;
      if (!route) return res.status(400).json({ error: "Endpoint DSS não permitido." });

      const { DSS_BASE_URL, DSS_USER, DSS_PASSWORD, DSS_DATABASE } = process.env;
      if (!DSS_BASE_URL || !DSS_USER || !DSS_PASSWORD || !DSS_DATABASE) {
        return res.status(503).json({ error: "Integração DSS não configurada no backend." });
      }

      const base = new URL(DSS_BASE_URL);
      if (base.protocol !== "https:" || !base.hostname.endsWith("dssinformatica.com.br")) {
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

      const target = new URL(route, base.toString().replace(/\/?$/, "/"));
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
      const text = await upstream.text();
      let data: any;
      try { data = JSON.parse(text); }
      catch { return res.status(502).json({ error: "O DSS retornou uma resposta que não é JSON válido." }); }

      if (!upstream.ok) return res.status(502).json({ error: "Erro na consulta ao DSS.", status: upstream.status });
      if (data?.mensagemErro?.trim()) return res.status(502).json({ error: "O DSS informou um erro na consulta.", details: data.mensagemErro });
      return res.json(data);
    } catch (error: any) {
      console.error("[DSS] Falha na consulta:", error?.message || "erro desconhecido");
      return res.status(502).json({ error: "Não foi possível consultar o DSS." });
    }
  });

  // Legacy proxy removed: clients may not choose arbitrary upstream URLs.
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
