const http = require('http');
const fs = require('fs');

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // ===== SWAGGER UI =====
    if (req.url === '/docs') {

        res.writeHead(200, {
            'Content-Type': 'text/html'
        });

        return res.end(`

        <!DOCTYPE html>
        <html>
        <head>
            <title>Swagger Pokemon API</title>

            <link rel="stylesheet"
            href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />

            <style>
                body {
                    margin: 0;
                    padding: 0;
                }
            </style>
        </head>

        <body>

            <div id="swagger-ui"></div>

            <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>

            <script>
                window.onload = () => {
                    SwaggerUIBundle({
                        url: '/swagger.json',
                        dom_id: '#swagger-ui'
                    });
                };
            </script>

        </body>
        </html>

        `);
    }

    // ===== SWAGGER JSON =====
    if (req.url === '/swagger.json') {

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return fs.createReadStream('./swagger.json').pipe(res);
    }

    // ===== API POKEMON =====
    if (
        req.url.startsWith('/api/pokemon1/')
        && req.method === 'GET'
    ) {

        try {

            if (!SUPABASE_URL || !SUPABASE_KEY) {
                throw new Error('Variables de entorno no configuradas');
            }

            const nombre = decodeURIComponent(
                req.url.split('/').pop()
            ).toLowerCase().trim();

            if (!nombre) {

                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: 'Nombre requerido'
                }));
            }

            // ===== URL SUPABASE =====
            const url =
`${SUPABASE_URL}/rest/v1/pokemon1?nombre=ilike.*${encodeURIComponent(nombre)}*&select=*`;

            console.log("🔍 Consultando:", url);

            const response = await fetch(url, {

                method: 'GET',

                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {

                const errorText = await response.text();

                throw new Error(
                    `Supabase Error ${response.status}: ${errorText}`
                );
            }

            const data = await response.json();

            if (!data || data.length === 0) {

                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: 'Pokemon no encontrado'
                }));
            }

            const p = data[0];

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({

                nombre: p.nombre,
                altura: p.altura,
                peso: p.peso,

                habilidades: Array.isArray(p.habilidades)
                    ? p.habilidades
                    : safeParse(p.habilidades),

                imagen_frontal: p.imagen_frontal,
                imagen_trasera: p.imagen_trasera,

                database: 'Supabase MySQL'

            }));

        } catch (error) {

            console.error("❌ ERROR:", error.message);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // ===== RUTA NO ENCONTRADA =====
    res.writeHead(404, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        error: 'Ruta no encontrada'
    }));
});

// ===== PARSE JSON SEGURO =====
function safeParse(value) {

    try {

        return JSON.parse(value);

    } catch {

        return value
            ? [value]
            : [];
    }
}

server.listen(PORT, () => {

    console.log(`🚀 SQL API funcionando en puerto ${PORT}`);

    console.log(`📘 Swagger: http://localhost:${PORT}/docs`);
});
