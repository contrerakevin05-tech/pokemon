const http = require('http');
const fs = require('fs');

const fetch = global.fetch;

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ===== VALIDAR VARIABLES =====
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Faltan variables de entorno SUPABASE");
}

const server = http.createServer(async (req, res) => {

    console.log("📥 URL RECIBIDA:", req.url);

    // ===== CORS =====
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, apikey'
    );

    // ===== PREFLIGHT =====
    if (req.method === 'OPTIONS') {

        res.writeHead(204);

        return res.end();
    }

    // =====================================================
    // ==================== SWAGGER UI ======================
    // =====================================================

    if (req.url === '/docs') {

        res.writeHead(200, {
            'Content-Type': 'text/html'
        });

        return res.end(`
        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>Swagger Pokemon API</title>

            <link rel="stylesheet"
            href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">

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

    // =====================================================
    // ================== SWAGGER JSON ======================
    // =====================================================

    if (req.url === '/swagger.json') {

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return fs
            .createReadStream('./swagger.json')
            .pipe(res);
    }

    // =====================================================
    // ==================== API POKEMON =====================
    // =====================================================

    if (
        req.url.startsWith('/api/pokemon/')
        && req.method === 'GET'
    ) {

        try {

            // ===== EXTRAER NOMBRE =====
            const nombre = decodeURIComponent(
                req.url.split('/').pop()
            ).toLowerCase().trim();

            console.log("🔍 Pokemon:", nombre);

            if (!nombre) {

                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: 'Nombre requerido'
                }));
            }

            // ===== URL SUPABASE =====
            const supabaseUrl =
`${SUPABASE_URL}/rest/v1/pokemon1?nombre=ilike.*${encodeURIComponent(nombre)}*&select=*`;

            console.log("🌐 URL SUPABASE:", supabaseUrl);

            // ===== CONSULTA =====
            const response = await fetch(supabaseUrl, {

                method: 'GET',

                headers: {

                    apikey: SUPABASE_KEY,

                    Authorization:
                        `Bearer ${SUPABASE_KEY}`,

                    'Content-Type':
                        'application/json'
                }
            });

            // ===== ERROR SUPABASE =====
            if (!response.ok) {

                const errorText = await response.text();

                console.error(
                    "❌ ERROR SUPABASE:",
                    errorText
                );

                throw new Error(
                    `Supabase Error ${response.status}`
                );
            }

            const data = await response.json();

            console.log("📦 DATA:", data);

            // ===== NO ENCONTRADO =====
            if (!data || data.length === 0) {

                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: 'Pokemon no encontrado'
                }));
            }

            const p = data[0];

            // ===== RESPUESTA =====
            const pokemon = {

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

                source: 'mysql'
            };

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(
                JSON.stringify(pokemon)
            );

        } catch (error) {

            console.error(
                "❌ ERROR GENERAL:",
                error.message
            );

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // =====================================================
    // ================== RUTA NO EXISTE ===================
    // =====================================================

    res.writeHead(404, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        error: 'Ruta no encontrada'
    }));
});

// =====================================================
// ================= SAFE JSON PARSE ====================
// =====================================================

function safeParse(value) {

    try {

        return JSON.parse(value);

    } catch {

        return value
            ? [value]
            : [];
    }
}

// =====================================================
// ==================== START SERVER ====================
// =====================================================

server.listen(PORT, () => {

    console.log(
        `🚀 SQL API funcionando en puerto ${PORT}`
    );

    console.log(
        `📘 Swagger: http://localhost:${PORT}/docs`
    );
});
