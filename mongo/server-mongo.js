require('dotenv').config();

const http = require('http');
const { MongoClient } = require('mongodb');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const express = require('express');

const PORT = process.env.PORT || 3001;

// ================= MONGO URI =================
const MONGO_URI = process.env.MONGO_URI;

// ================= CONFIG =================
const DB_NAME = "pokeapi";
const COLLECTION_NAME = "pokemon";

let db = null;

// ================= SWAGGER =================
const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Mongo Pokémon API',
            version: '1.0.0',
            description: 'Microservicio Pokémon usando MongoDB Atlas'
        },
        servers: [
            {
                url: 'https://pokemon2-qq1z.onrender.com'
            }
        ]
    },
    apis: ['./server.js']
});

// ================= CONEXIÓN MONGO =================
async function connectDB() {

    if (db) return db;

    try {

        const client = new MongoClient(MONGO_URI);

        await client.connect();

        console.log("✅ MongoDB conectado");

        db = client.db(DB_NAME);

        return db;

    } catch (error) {

        console.error("❌ Error Mongo:", error.message);

        throw error;
    }
}

// ================= SERVER =================
const server = http.createServer(async (req, res) => {

    console.log("📥", req.method, req.url);

    // ================= CORS =================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {

        res.writeHead(204);

        return res.end();
    }

    // ================= SWAGGER JSON =================
    if (req.url === '/swagger-mongo.json') {

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return res.end(JSON.stringify(swaggerSpec));
    }

    // ================= SWAGGER UI =================
    if (req.url.startsWith('/docs')) {

        const app = express();

        app.use('/docs',
            swaggerUi.serve,
            swaggerUi.setup(swaggerSpec)
        );

        return app(req, res);
    }

    /**
     * @swagger
     * /:
     *   get:
     *     summary: Ruta principal
     *     description: Verifica si la API Mongo funciona
     *     responses:
     *       200:
     *         description: API funcionando
     */

    // ================= HOME =================
    if (req.url === '/') {

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return res.end(JSON.stringify({
            mensaje: "Microservicio Mongo funcionando 🚀",
            endpoints: [
                "/api/pokemon/pikachu",
                "/docs"
            ]
        }));
    }

    /**
     * @swagger
     * /api/pokemon/{nombre}:
     *   get:
     *     summary: Obtener Pokémon
     *     description: Busca un Pokémon en MongoDB Atlas
     *     parameters:
     *       - in: path
     *         name: nombre
     *         required: true
     *         schema:
     *           type: string
     *         description: Nombre del Pokémon
     *     responses:
     *       200:
     *         description: Pokémon encontrado
     *       404:
     *         description: Pokémon no encontrado
     *       500:
     *         description: Error interno
     */

    // ================= API POKEMON =================
    if (req.url.startsWith('/api/pokemon/') && req.method === 'GET') {

        try {

            const database = await connectDB();

            const nombre = decodeURIComponent(
                req.url.split('/').pop()
            )
                .trim()
                .toLowerCase();

            if (!nombre) {

                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: "Nombre requerido"
                }));
            }

            // ================= BUSCAR =================
            const pokemon = await database
                .collection(COLLECTION_NAME)
                .findOne({
                    nombre: {
                        $regex: `^${nombre}$`,
                        $options: 'i'
                    }
                });

            // ================= NO ENCONTRADO =================
            if (!pokemon) {

                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                return res.end(JSON.stringify({
                    error: "Pokémon no encontrado"
                }));
            }

            // ================= RESPONSE =================
            const response = {
                nombre: pokemon.nombre,
                altura: pokemon.altura,
                peso: pokemon.peso,
                tipos: pokemon.tipos || [],
                habilidades: pokemon.habilidades || [],
                imagenes: pokemon.imagenes || {},
                source: "mongo"
            };

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify(response));

        } catch (error) {

            console.error("❌ ERROR API:", error.message);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            return res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // ================= 404 =================
    res.writeHead(404, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        error: "Ruta no encontrada"
    }));
});

// ================= START =================
server.listen(PORT, () => {

    console.log(`🚀 Mongo API corriendo en puerto ${PORT}`);
    console.log(`📘 Swagger en /docs`);
});
