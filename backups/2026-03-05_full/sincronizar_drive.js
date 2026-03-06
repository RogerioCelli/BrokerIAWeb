const { google } = require('googleapis');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// CONFIGURAÇÕES - Preencha o ID da sua pasta ApolicesHub aqui
const FOLDER_ID_APOLICES_HUB = 'SEU_ID_DA_PASTA_AQUI';

async function sincronizar() {
    console.log('🚀 Iniciando sincronização do Google Drive com o Banco de Dados...');

    // 1. Configurar Conexão com Banco de Dados
    const pool = new Pool({
        connectionString: process.env.APOLICES_DATABASE_URL || 'postgres://postgres:adb24c7c56e0659343d0@brokeria_apolices:5432/postgres?sslmode=disable',
    });

    // 2. Autenticar com Google Drive
    if (!fs.existsSync('google_credentials.json')) {
        console.error('❌ Erro: Arquivo google_credentials.json não encontrado na raiz do projeto!');
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: 'google_credentials.json',
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    try {
        // 3. Listar pastas de CPF dentro da ApolicesHub
        console.log('📂 Lendo pastas de CPF...');
        const resFolders = await drive.files.list({
            q: `'${FOLDER_ID_APOLICES_HUB}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name)',
        });

        const cpfFolders = resFolders.data.files;
        console.log(`✅ Foram encontradas ${cpfFolders.length} pastas de CPF.`);

        for (const folder of cpfFolders) {
            const cpf = folder.name.replace(/\D/g, '');
            console.log(`\n🔍 Processando CPF: ${cpf}`);

            // 4. Listar PDFs dentro da pasta do CPF
            const resFiles = await drive.files.list({
                q: `'${folder.id}' in parents and mimeType = 'application/pdf'`,
                fields: 'files(id, name, webViewLink)',
            });

            const pdfs = resFiles.data.files;

            if (pdfs.length === 0) {
                console.log(`⚠️ Nenhum PDF encontrado para o CPF ${cpf}.`);
                continue;
            }

            for (const pdf of pdfs) {
                console.log(`📄 Encontrado: ${pdf.name}`);

                // 5. Atualizar URL no Banco de Dados
                // Tentamos casar pelo CPF (limpo) e possivelmente pelo número da apólice se estiver no nome do arquivo
                const query = `
                    UPDATE apolices_brokeria 
                    SET url_pdf = $1 
                    WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $2
                    AND (url_pdf IS NULL OR url_pdf = '')
                `;

                const result = await pool.query(query, [pdf.webViewLink, cpf]);

                if (result.rowCount > 0) {
                    console.log(`✅ Banco atualizado para o CPF ${cpf} (${result.rowCount} registros).`);
                } else {
                    console.log(`ℹ️ Registro já estava atualizado ou CPF não encontrado no banco.`);
                }
            }
        }

        console.log('\n✨ Sincronização concluída com sucesso!');

    } catch (err) {
        console.error('❌ Erro durante a sincronização:', err);
    } finally {
        await pool.end();
    }
}

sincronizar();
