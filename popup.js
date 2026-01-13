document.addEventListener('DOMContentLoaded', function() {
    let stats = { xp: 0 };
    let processados = [];
    const RANKS = [
        {n:"RECRUTA", min:0, i:"🐣"}, {n:"APRENDIZ", min:500, i:"📜"}, {n:"NOVATO", min:1200, i:"👣"}, {n:"ESPECIALISTA", min:5000, i:"🎯"}
    ];

    // Mapa de perguntas finais (WhatsApp)
    const TEXTOS_OCORRENCIA = {
        "ATRASO NA ENTREGA": "Poderia confirmar se o pedido já saiu para entrega ou se já foi finalizado?",
        "CONSTA ENTREGUE MAS CLIENTE NÃO RECEBEU": "Poderia confirmar se o pedido já saiu para entrega ou se já foi finalizado?",
        "EXTRAVIO": "Poderia verificar com o cliente o melhor horário para reenvio e fazer a abertura do card 10 de extravio? Segue link: https://app.pipefy.com/public/form/uqxfq_0B",
        "PEDIDO ENTREGUE NO ENDEREÇO ERRADO": "Poderia checar a possibilidade de retirar no endereço incorreto e entregar no destino certo?",
        "PRODUTO/SACOLA/CAIXA DANIFICADA": "Poderia verificar com o cliente se ele prefere a troca do item ou o estorno do valor?",
        "RECLAMAÇAO DE ENTREGADORES": "Poderia abrir o card 13 de reclamação de entregador para registro da reclamação? Segue link: https://app.pipefy.com/public/form/uqxfq_0B",
        "VOLUME/PRODUTO A MAIS": "Poderia checar a possibilidade de retirada no endereço?",
        "CANCELAMENTO": "Poderia seguir o cancelamento e o estorno do pedido?"
    };

    // Mapa de Modelos para o Relatório Técnico
    const MODELOS_DESCRICAO = {
        "ATRASO NA ENTREGA": "Identificamos que o pedido está com o prazo de entrega expirado e o cliente solicita prioridade.",
        "CONSTA ENTREGUE MAS CLIENTE NÃO RECEBEU": "Cliente informou que o pedido consta como finalizado, porém não houve o recebimento físico no local.",
        "EXTRAVIO": "Confirmamos o extravio da mercadoria em trânsito após análise interna e com a transportadora.",
        "PEDIDO ENTREGUE NO ENDEREÇO ERRADO": "O pacote foi entregue em um endereço divergente. Necessário acionar o motorista para recuperação.",
        "PRODUTO/SACOLA/CAIXA DANIFICADA": "O cliente reportou que a embalagem chegou violada ou danificada.",
        "RECLAMAÇAO DE ENTREGADORES": "Recebemos um relato de conduta inadequada por parte do entregador no ato da entrega.",
        "VOLUME/PRODUTO A MAIS": "Identificado volumes excedentes na entrega que não pertencem ao pedido original.",
        "CANCELAMENTO": "Cliente solicita o cancelamento imediato da compra e o estorno dos valores."
    };

    function obterSaudacao() {
        const hora = new Date().getHours();
        if (hora >= 4 && hora < 12) return "Bom dia";
        if (hora >= 12 && hora < 18) return "Boa tarde";
        if (hora >= 18 && hora < 24) return "Boa noite";
        return "Boa madrugada";
    }

    function enviarParaOManager(dados) {
        const webhookURL = "SEU_URL_DO_APPS_SCRIPT_AQUI";
        fetch(webhookURL, { method: "POST", mode: "no-cors", body: JSON.stringify(dados) });
    }

    chrome.storage.local.get(['px_stats', 'px_agente_nome', 'px_pedidos_processados'], (res) => {
        if (res.px_stats) stats = res.px_stats;
        if (res.px_pedidos_processados) processados = res.px_pedidos_processados;
        if (res.px_agente_nome) mostrarMain(res.px_agente_nome);
        atualizarProgresso();
    });

    document.getElementById('btnCapturar').onclick = () => {
        document.getElementById('btnCapturar').innerText = "⏳ LENDO BACKOFFICE...";
        window.parent.postMessage({ type: "SOLICITAR_DADOS_PAGINA" }, "*");
    };

    window.addEventListener("message", (event) => {
        if (event.data.type === "DADOS_COLETADOS") {
            const d = event.data.payload;
            
            document.getElementById('pedido').value = d.pedido || "";
            document.getElementById('loja').value = d.loja || "";
            document.getElementById('cliente').value = d.cliente || "";
            
            // PREENCHIMENTO DA OCORRÊNCIA VIA SCANNER
            const ocrCapturada = (d.ocorrencia || "").toUpperCase();
            document.getElementById('ocorrencia').value = ocrCapturada;

            // AUTO-PREENCHIMENTO DO RELATÓRIO BASEADO NA OCORRÊNCIA CAPTURADA
            if (MODELOS_DESCRICAO[ocrCapturada]) {
                document.getElementById('Descricao').value = MODELOS_DESCRICAO[ocrCapturada];
            } else if (d.detalhe) {
                document.getElementById('Descricao').value = d.detalhe;
            }

            document.getElementById('btnCapturar').innerText = "✅ SUCESSO!";
            setTimeout(() => { document.getElementById('btnCapturar').innerText = "🔍 SCANNER DE DADOS 3.0"; }, 2000);
        }
    });

    document.getElementById('btnEntrar').onclick = () => {
        const nome = document.getElementById('nomeAgenteInput').value.trim();
        if (nome) chrome.storage.local.set({ px_agente_nome: nome }, () => location.reload());
    };

    function mostrarMain(nome) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'flex';
        document.getElementById('exibeAgente').innerText = `AGENTE: ${nome.toUpperCase()}`;
    }

    document.getElementById('btnLimpar').onclick = () => {
        ['loja', 'pedido', 'cliente', 'ocorrencia', 'Descricao', 'resultado'].forEach(id => document.getElementById(id).value = "");
    };

    document.getElementById('btnGerar').onclick = () => {
        const loja = document.getElementById('loja').value || "____";
        const pedido = document.getElementById('pedido').value || "____";
        const cliente = document.getElementById('cliente').value || "____";
        const ocr = document.getElementById('ocorrencia').value.toUpperCase();
        const desc = document.getElementById('Descricao').value;
        
        const saudacoesIniciais = ["Olá equipe", "Oi time", "Olá pessoal"];
        const cumprimento = saudacoesIniciais[Math.floor(Math.random() * saudacoesIniciais.length)];
        const perguntaOcr = TEXTOS_OCORRENCIA[ocr] || "Poderia verificar o status deste pedido e nos retornar?";

        const msg = `${cumprimento}! ${obterSaudacao()}. Espero que esteja bem. 😊\nVocês estão na loja *${loja}*? 🏪\n\nSobre o pedido *${pedido}* (${cliente}), identificamos: *${ocr}*.\n\n📝 *Relato:* ${desc || 'Aguardamos retorno.'}\n\n${perguntaOcr} 🙏`;
        
        document.getElementById('resultado').value = msg;

        if(pedido !== "____" && !processados.includes(pedido)) {
            stats.xp += 10; processados.push(pedido);
            chrome.storage.local.set({px_stats: stats, px_pedidos_processados: processados}, atualizarProgresso);
        }

        const nomeAgente = document.getElementById('exibeAgente').innerText.replace("AGENTE: ", "");
        enviarParaOManager({
            data: new Date().toLocaleString('pt-BR'),
            agente: nomeAgente,
            loja: loja,
            pedido: pedido,
            ocorrencia: ocr,
            descricao: desc
        });
    };

    document.getElementById('btnCopiar').onclick = () => {
        const campo = document.getElementById('resultado');
        campo.select(); document.execCommand('copy');
        document.getElementById('btnCopiar').innerText = "OK! ✅";
        setTimeout(() => { document.getElementById('btnCopiar').innerText = "📋 COPIAR"; }, 1500);
    };

    document.getElementById('btnWA').onclick = () => {
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(document.getElementById('resultado').value)}`);
    };

    function atualizarProgresso() {
        let atual = RANKS[0];
        RANKS.forEach(r => { if(stats.xp >= r.min) atual = r; });
        document.getElementById('rankIcon').innerText = atual.i;
        document.getElementById('rankName').innerText = atual.n;
        document.getElementById('xpText').innerText = stats.xp + " XP";
        const idx = RANKS.indexOf(atual);
        const proximo = RANKS[idx + 1] || atual;
        const perc = ((stats.xp - atual.min) / (proximo.min - atual.min)) * 100;
        document.getElementById('xpBarFill').style.width = (perc > 100 ? 100 : perc) + "%";
    }
});