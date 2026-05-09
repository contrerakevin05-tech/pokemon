require('dotenv').config();

const http = require('http');
const fetch = global.fetch;

const PORT = process.env.PORT || 3000;

// ================= ENV =================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Faltan variables de entorno");
}

// ================= SERVER =================
const server = http.createServer(async (req, res) => {

    console.log("📥", req.method, req.url);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // HOME
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            message: "Pokémon API funcionando 🚀"
        }));
    }

    // ================= POKEMON =================
    if (req.url.startsWith('/api/pokemon/') && req.method === 'GET') {

        try {

            const nombre = decodeURIComponent(req.url.split('/').pop())
                .trim()
                .toLowerCase();

            if (!nombre) {
                res.writeHead(400);
                return res.end(JSON.stringify({
                    error: "Nombre requerido"
                }));
            }

            // 🔥 FIX REAL: EQ (NO ILIKE)
            const url =`${SUPABASE_URL}/rest/v1/pokemon1?select=*&nombre=ilike.${encodeURIComponent(nombre)}`;

            console.log("🔥 URL FINAL:", url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err);
            }

            const data = await response.json();

            // 🔥 FIX: validación fuerte
            if (!Array.isArray(data) || data.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({
                    error: "Pokémon no encontrado"
                }));
            }

            const p = data[0];

            // ================= RESPONSE UNIFICADA =================
            const pokemon = {
                nombre: p.nombre,
                altura: p.altura,
                peso: p.peso,
                habilidades: safeParse(p.habilidades),
                imagenes: {
                    frontal: p.imagen_frontal || "",
                    trasera: p.imagen_trasera || ""
                },
                source: "supabase"
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(pokemon));

        } catch (error) {

            console.error("❌ ERROR:", error.message);

            res.writeHead(500);
            return res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // 404 GENERAL
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Ruta no encontrada" }));
});

// ================= SAFE PARSE =================
function safeParse(value) {
    try {
        return typeof value === "string"
            ? JSON.parse(value)
            : value || [];
    } catch {
        return value ? [value] : [];
    }
}

// ================= START =================
server.listen(PORT, () => {
    console.log(`🚀 API corriendo en puerto ${PORT}`);
});
