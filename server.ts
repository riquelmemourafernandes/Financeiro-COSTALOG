import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple in-memory cache
  const cache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  // Proxy route to bypass CORS and Mixed Content (HTTP vs HTTPS)
  // Supporting both GET and POST for flexibility
  const proxyHandler = async (req: express.Request, res: express.Response) => {
    try {
      const url = req.method === 'POST' ? req.body.url : req.query.url;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL parameter is required" });
      }

      // Check cache first
      const cached = cache.get(url);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[PROXY] Cache hit for URL: ${url.replace(/senha=[^&]+/, 'senha=***')}`);
        return res.json(cached.data);
      }

      // Only allow proxying to the specific DSS domain for security
      if (!url.startsWith("http://costalog.dssinformatica.com.br") && !url.startsWith("https://costalog.dssinformatica.com.br")) {
        return res.status(403).json({ error: "Domain not allowed" });
      }

      console.log(`[PROXY] [${req.method}] Received URL: ${url.replace(/senha=[^&]+/, 'senha=***')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        timeout: 30000, // 30 seconds timeout
      } as any);
      
      console.log(`[PROXY] Response status: ${response.status} (${response.statusText})`);
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json() as any;
        
        // If the API returns a 200 but with an error message inside
        if (data && data.mensagemErro && data.mensagemErro.trim() !== "") {
          console.warn(`[PROXY] API returned logic error: ${data.mensagemErro}`);
        }
        
        // Store in cache
        cache.set(url, { data, timestamp: Date.now() });
        
        res.json(data);
      } else {
        const text = await response.text();
        console.warn(`[PROXY] Remote server returned non-JSON (${contentType}):`, text.substring(0, 1000));
        
        if (response.status >= 400) {
          // Try to extract a cleaner error message from the HTML if possible
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          const h1Match = text.match(/<h1>(.*?)<\/h1>/i);
          const errorInfo = h1Match ? h1Match[1] : (titleMatch ? titleMatch[1] : "Erro desconhecido");
          
          res.status(response.status).json({ 
            error: "Erro no servidor remoto (DSS)", 
            status: response.status,
            statusText: response.statusText,
            details: errorInfo.replace(/<[^>]*>?/gm, '').trim(),
            raw: text.substring(0, 200)
          });
        } else {
          // If it's a 200 but not JSON, try to send it as text
          res.status(response.status).send(text);
        }
      }
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  };

  app.get("/api/proxy", proxyHandler);
  app.post("/api/proxy", proxyHandler);

  app.post("/api/proxy/clear", (req, res) => {
    cache.clear();
    console.log("[PROXY] Cache cleared by user");
    res.json({ status: "ok", message: "Cache cleared" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
