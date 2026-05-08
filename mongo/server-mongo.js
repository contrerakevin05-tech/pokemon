const http = require('http');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// ⚠️ PEGA AQUÍ TU URI REAL DE MONGODB ATLAS
const MONGO_URI = "mongodb+srv://kevin:1234@pokemon1.ddcxqpt.mongodb.net/?retryWrites=true&w=majority&appName=pokemon1";

// ===== CONFIG =====
const DB_NAME = "pokeapi";
const COLLECTION_NAME = "pokemon";

let db = null;

// ===== CONEXIÓN MONGO =====
async function connectDB() {

    if (db) return db;

    try {

        const client = new MongoClient(MONGO_URI);

        await client.connect();

        console.log("✅ MongoDB conectado");

        db = client.db(DB_NAME);

        return db;

    } catch (error) {

        console.error("❌ Error conectando Mongo:", error.message);

        throw error;
    }
}

// ===== SERVER =====
const server = http.createServer(async (req, res) => {

    // ===== CORS =====
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // ===== HOME =====
    if (req.url === '/') {

        res.writeHead(200, { 'Content-Type': 'application/json' });

        return res.end(JSON.stringify({
            mensaje: "Microservicio Mongo funcionando",
            endpoints: [
                "/api/pokemon/pikachu",
                "/docs"
            ]
        }));
    }

    // ===== SWAGGER UI =====
    if (req.url === '/docs') {

        res.writeHead(200, { 'Content-Type': 'text/html' });

        return res.end(`
            <html>
            <head>
                <title>Swagger Mongo API</title>
                <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
            </head>
            <body>
                <div id="swagger-ui"></div>

                <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>

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

        try {

            const swaggerPath = path.join(__dirname, 'swagger-mongo.json');

            if (!fs.existsSync(swaggerPath)) {

                throw new Error("No existe swagger-mongo.json");
            }

            const swaggerData = fs.readFileSync(swaggerPath, 'utf8');

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(swaggerData);

        } catch (error) {

            console.error("❌ Swagger Error:", error.message);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // ===== API POKEMON =====
    if (req.url.startsWith('/api/pokemon/') && req.method === 'GET') {

        try {

            const database = await connectDB();

            const nombre = decodeURIComponent(
                req.url.split('/').pop()
            ).trim();

            if (!nombre) {

                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: "Nombre requerido"
                }));
            }

            // ===== BUSCAR POKEMON =====
            const pokemon = await database
                .collection(COLLECTION_NAME)
                .findOne({
                    nombre: {
                        $regex: `^${nombre}$`,
                        $options: 'i'
                    }
                });

            // ===== NO ENCONTRADO =====
            if (!pokemon) {

                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: "Pokémon no encontrado"
                }));
            }

            // ===== RESPUESTA =====
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({
                nombre: pokemon.nombre,
                altura: pokemon.altura,
                peso: pokemon.peso,
                tipos: pokemon.tipos || [],
                habilidades: pokemon.habilidades || [],
                imagenes: pokemon.imagenes || {},
                source: "mongo"
            }));

        } catch (error) {

            console.error("❌ ERROR API:", error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // ===== 404 =====
    res.writeHead(404, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        error: "Ruta no encontrada"
    }));
});

// ===== START =====
server.listen(PORT, () => {

    console.log(`🚀 Mongo API corriendo en http://localhost:${PORT}`);

});
