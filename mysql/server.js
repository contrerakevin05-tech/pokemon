const http = require('http');
const fs = require('fs');

// usar fetch nativo
const fetch = global.fetch;

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Faltan variables de entorno SUPABASE");
}

const server = http.createServer(async (req, res) => {

    // ===== CORS =====
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // ===== SWAGGER UI =====
    if (req.url === '/docs') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
            <html>
            <head>
                <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
            </head>
            <body>
                <div id="swagger-ui"></div>
                <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                <script>
                    SwaggerUIBundle({
                        url: '/swagger.json',
                        dom_id: '#swagger-ui'
                    });
                </script>
            </body>
            </html>
        `);
    }

    // ===== SWAGGER JSON =====
    if (req.url === '/swagger.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return fs.createReadStream('./swagger.json').pipe(res);
    }

    // ===== API =====
    if (req.url.startsWith('/api/pokemon1/') && req.method === 'GET') {

        try {
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                throw new Error("Variables de entorno no configuradas");
            }

            const name = decodeURIComponent(req.url.split('/').pop()).toLowerCase().trim();

            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Nombre requerido" }));
            }

            const url = `${SUPABASE_URL}/pokemon1?nombre=ilike.*${name}*`;

            console.log("🔍 Buscando:", url);

            const response = await fetch(url, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "No encontrado" }));
            }

            const p = data[0];

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                name: p.nombre,
                height: p.altura,
                weight: p.peso,
                abilities: Array.isArray(p.habilidades)
                    ? p.habilidades
                    : safeParse(p.habilidades),
                images: {
                    front: p.imagen_frontal,
                    back: p.imagen_trasera
                },
                source: "mysql"
            }));

        } catch (err) {
            console.error("❌ ERROR SQL:", err.message);

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    }

    // ===== DEFAULT =====
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Ruta no encontrada" }));
});

// parse seguro
function safeParse(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value ? [value] : [];
    }
}

server.listen(PORT, () => {
    console.log(`🚀 SQL API funcionando en puerto ${PORT}`);
});
