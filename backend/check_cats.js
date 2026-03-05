const db = require('./db');

async function check() {
    try {
        const cats = await db.query('SELECT * FROM categorias_seguros ORDER BY ordem');
        console.log('CATEGORIAS:', JSON.stringify(cats.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
