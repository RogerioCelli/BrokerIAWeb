const db = require('./db');
const schedule = require('node-schedule'); // If node-schedule isn't available, we use setInterval fallback below

function startDailyExpirationJob() {
    console.log("[CRON] Inicializando Job de Expiração de Apólices...");

    // Esta função será chamada todo dia à meia noite (ou no setInterval)
    const runExpiration = async () => {
        try {
            console.log(`[CRON-EXPIRATION] Iniciando verificação de apólices vencidas em ${new Date().toLocaleString()}`);

            // A regra: se a data atual (CURRENT_DATE) for MAIOR que a vigencia_fim (ou seja, vigencia_fim = hoje - 1 ou antes)
            // Somente altera se o status não for 'VENCIDA' para evitar updates desnecessários
            const query = `
                UPDATE apolices_brokeria
                SET status_apolice = 'VENCIDA'
                WHERE 
                    vigencia_fim IS NOT NULL 
                    AND CURRENT_DATE > TO_DATE(vigencia_fim, 'DD/MM/YYYY')
                    AND status_apolice != 'VENCIDA'
                RETURNING id_apolice, numero_apolice;
            `;

            // Tratamento especial pois no banco algumas datas podem estar em formatos estranhos
            // O ideal real no regex puro:
            const safeQuery = `
                UPDATE apolices_brokeria
                SET status_apolice = 'VENCIDA'
                WHERE 
                    vigencia_fim LIKE '%/%/%'
                    AND TO_DATE(vigencia_fim, 'DD/MM/YYYY') < CURRENT_DATE
                    AND status_apolice != 'VENCIDA'
                RETURNING numero_apolice;
            `;

            const result = await db.apolicesQuery(safeQuery);

            if (result.rowCount > 0) {
                console.log(`[CRON-EXPIRATION] Sucesso! ${result.rowCount} apólices foram marcadas como VENCIDAS.`);
            } else {
                console.log(`[CRON-EXPIRATION] Nenhuma apólice nova precisou ser vencida hoje.`);
            }

        } catch (error) {
            console.error("[CRON-EXPIRATION] ERRO ao tentar expirar apólices:", error);
            // Isso geralmente acontece se tiver sujeira no vigencia_fim que impeça o TO_DATE
        }
    };

    // Roda uma vez assim que o servidor subir para limpar o passado
    setTimeout(runExpiration, 10000); // 10s após boot

    // E roda a cada 12 horas para garantir que vira no dia certo (12 * 60 * 60 * 1000 = 43200000 ms)
    setInterval(runExpiration, 43200000);
}

module.exports = { startDailyExpirationJob };
