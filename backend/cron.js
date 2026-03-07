const db = require('./db');

function startDailyExpirationJob() {
    console.log("[CRON] Inicializando Job de Expiração de Apólices...");

    // Esta função será chamada todo dia à meia noite (ou no setInterval)
    const runExpiration = async () => {
        try {
            console.log(`[CRON-EXPIRATION] Iniciando verificação de apólices vencidas em ${new Date().toLocaleString()}`);

            // Buscamos todas as apólices que NÃO estão vencidas e POSSUEM alguma data
            const query = `
                SELECT id_apolice, numero_apolice, vigencia_fim 
                FROM apolices_brokeria 
                WHERE status_apolice != 'VENCIDA' 
                  AND vigencia_fim IS NOT NULL 
                  AND TRIM(vigencia_fim) != ''
            `;

            const { rows } = await db.apolicesQuery(query);

            if (rows.length === 0) {
                console.log(`[CRON-EXPIRATION] Nenhuma apólice ativa com data encontrada para verificar hoje.`);
                return;
            }

            // Hoje, zerado meia-noite pra comparar apenas o DIA
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            let expiredCount = 0;
            const idsToExpire = [];

            for (const row of rows) {
                try {
                    // Padrão esperado do banco: DD/MM/YYYY
                    const vigenciaFormat = String(row.vigencia_fim).trim();
                    const parts = vigenciaFormat.split('/');

                    if (parts.length === 3) {
                        const dia = parseInt(parts[0], 10);
                        const mes = parseInt(parts[1], 10) - 1; // 0-11
                        const ano = parseInt(parts[2], 10);

                        const dataFim = new Date(ano, mes, dia);
                        dataFim.setHours(0, 0, 0, 0);

                        // Se a data que montamos for válida E estiver no passado em relação a HOJE
                        if (!isNaN(dataFim.getTime()) && dataFim < hoje) {
                            idsToExpire.push(row.id_apolice);
                        }
                    }
                } catch (e) {
                    // Ignora silenciosamente registros com formatos de data lixo ('VITALICIA', '000', etc)
                }
            }

            if (idsToExpire.length > 0) {
                // Atualiza todas em um único IN pra performance
                const updateQuery = `
                    UPDATE apolices_brokeria
                    SET status_apolice = 'VENCIDA'
                    WHERE id_apolice = ANY($1)
                `;
                const updateResult = await db.apolicesQuery(updateQuery, [idsToExpire]);
                console.log(`[CRON-EXPIRATION] Sucesso! ${updateResult.rowCount} apólices foram marcadas como VENCIDAS.`);
            } else {
                console.log(`[CRON-EXPIRATION] Checagem concluída. Nenhuma apólice nova precisou ser vencida hoje.`);
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
