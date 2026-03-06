const https = require('https');

const fetchJson = async (url, options) => {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
};

async function getStagingData() {
    try {
        const baseUrl = 'https://brokeria-api-brokeriaweb.cx0m9g.easypanel.host';

        console.log("1. Solicitando acesso admin...");
        const reqOpts1 = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: '11806562880' })
        };
        const res1 = await fetchJson(`${baseUrl}/api/admin/auth/request`, reqOpts1);
        const admin_id = res1.admin_id;

        console.log("2. Validando token master (999888)...");
        const reqOpts2 = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id, token: '999888' })
        };
        const res2 = await fetchJson(`${baseUrl}/api/admin/auth/validate`, reqOpts2);
        const jwtToken = res2.token;

        console.log("3. Buscando fila de staging...");
        const reqOpts3 = {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        };
        const res3 = await fetchJson(`${baseUrl}/api/admin/staging/list`, reqOpts3);

        if (res3 && res3.length > 0) {
            console.log("DADOS JSON ENCONTRADOS NO 1º ITEM PENDENTE:");
            console.dir(res3[0].dados_json, { depth: null });
        } else {
            console.log("Fila de staging vazia.");
        }
    } catch (err) {
        console.error(err);
    }
}

getStagingData();
