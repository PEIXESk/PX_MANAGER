/**
 * PX MANAGER - Content Script (Correção de Extração + Clique Fora + Auto-Detecção)
 */

let btn = null;
let frame = null;
let xOffset = 0, yOffset = 0, initialX, initialY, isDragging = false;

function garantirElementos() {
    if (document.getElementById('px-btn-flutuante')) {
        btn = document.getElementById('px-btn-flutuante');
        frame = document.getElementById('px-frame-app');
        return;
    }

    btn = document.createElement('div');
    btn.id = 'px-btn-flutuante';
    const iconUrl = chrome.runtime.getURL('icon.png');

    btn.style.cssText = `
        position: fixed !important; bottom: 20px !important; right: 20px !important; 
        width: 60px !important; height: 60px !important; 
        background-color: #441F54 !important; background-image: url('${iconUrl}'); 
        background-size: cover; background-position: center;
        border: 3px solid #53C14B !important; border-radius: 50% !important; 
        cursor: move !important; z-index: 2147483647 !important; 
        box-shadow: 0 0 15px rgba(83, 193, 75, 0.6) !important; 
        display: none; touch-action: none; user-select: none !important;
    `;

    frame = document.createElement('iframe');
    frame.id = 'px-frame-app';
    frame.src = chrome.runtime.getURL('popup.html');
    frame.style.cssText = `
        position: fixed !important; width: 450px !important; height: 680px !important; 
        border: none !important; border-radius: 15px !important; 
        z-index: 2147483646 !important; display: none; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important; 
        transition: opacity 0.2s ease, transform 0.2s ease !important; 
        opacity: 0; transform: scale(0.95); pointer-events: auto;
    `;

    document.body.appendChild(btn);
    document.body.appendChild(frame);
    
    initEventos();
}

function verificarNavegacao() {
    const regexUrl = /\/ocorrencias\/bandeira\/(PA|EX)\/pedido\/\d+\/detalhe\/\d+/;
    if (regexUrl.test(window.location.href)) {
        garantirElementos();
        if (btn) btn.style.display = 'block';
    } else {
        if (btn) btn.style.display = 'none';
        fecharApp();
    }
}

setInterval(verificarNavegacao, 1000);

function initEventos() {
    btn.addEventListener("mousedown", (e) => {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === btn) isDragging = true;
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            e.preventDefault();
            let tx = e.clientX - initialX;
            let ty = e.clientY - initialY;
            
            // Limites da tela
            const rect = btn.getBoundingClientRect();
            const vW = window.innerWidth;
            const vH = window.innerHeight;
            if (rect.left < 0) tx += 5;
            if (rect.right > vW) tx -= 5;

            xOffset = tx; yOffset = ty;
            btn.style.transform = `translate(${tx}px, ${ty}px)`;
            if(frame.style.display === 'block') ajustarPosicaoFrame();
        }
    });

    document.addEventListener("mouseup", () => isDragging = false);

    btn.addEventListener('click', (e) => {
        if (!isDragging) {
            e.stopPropagation();
            if (frame.style.display !== 'block') {
                ajustarPosicaoFrame();
                frame.style.display = 'block';
                setTimeout(() => { frame.style.opacity = "1"; frame.style.transform = "scale(1)"; }, 10);
            } else {
                fecharApp();
            }
        }
    });

    // FECHAR AO CLICAR FORA (Corrigido)
    document.addEventListener('mousedown', (e) => {
        if (frame && frame.style.display === 'block') {
            if (!frame.contains(e.target) && e.target !== btn) {
                fecharApp();
            }
        }
    });
}

function ajustarPosicaoFrame() {
    const rect = btn.getBoundingClientRect();
    const vW = window.innerWidth;
    const vH = window.innerHeight;

    if (rect.left + 30 > vW / 2) {
        frame.style.left = "auto"; frame.style.right = (vW - rect.right) + "px";
    } else {
        frame.style.right = "auto"; frame.style.left = rect.left + "px";
    }

    if (rect.top < 350) {
        frame.style.bottom = "auto"; frame.style.top = (rect.bottom + 10) + "px";
    } else {
        frame.style.top = "auto"; frame.style.bottom = (vH - rect.top + 10) + "px";
    }
}

function fecharApp() {
    if (frame) {
        frame.style.opacity = "0";
        frame.style.transform = "scale(0.95)";
        setTimeout(() => { frame.style.display = 'none'; }, 200);
    }
}

// --- EXTRAÇÃO MELHORADA (Captura Descrição ant-col-md-24) ---

function extrairDadosGPA() {
    const texto = document.body.innerText;
    
    const buscarCampoMelhorado = (label) => {
        // Busca em todas as colunas possíveis do Ant Design
        const colunas = document.querySelectorAll('.ant-col-xs-24, .ant-col-md-6, .ant-col-md-24');
        for (let col of colunas) {
            if (col.innerText.startsWith(label) || col.querySelector('b')?.innerText.includes(label)) {
                // Pega o conteúdo de texto após o título (geralmente no segundo <p> ou texto direto)
                const ps = col.querySelectorAll('p');
                if (ps.length > 1) return ps[1].innerText.trim();
                return col.innerText.replace(label, "").trim();
            }
        }
        return "";
    };

    let ocr = buscarCampoMelhorado("Tipo de Ocorrência");
    const descSite = buscarCampoMelhorado("Descrição"); // Aqui captura a parte do PA que você enviou
    
    if (buscarCampoMelhorado("Categoria") === "CANCELAMENTO") ocr = "CANCELAMENTO";

    return {
        pedido: (texto.match(/Pedido Backoffice[:\s]+(\d+)/i) || texto.match(/(\d{8,12})/))[1] || "",
        loja: (texto.match(/Loja[:\s]+(\d+)/i) || texto.match(/Cód\.\s*Loja[:\s]+(\d+)/i))[1] || "",
        cliente: (texto.match(/Cliente[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i) || ["",""])[1].split('\n')[0].trim(),
        ocorrencia: ocr,
        detalhe: descSite || window.getSelection().toString() // Prioriza a descrição do site
    };
}

window.addEventListener("message", (event) => {
    if (event.data.type === "SOLICITAR_DADOS_PAGINA") {
        frame.contentWindow.postMessage({ type: "DADOS_COLETADOS", payload: extrairDadosGPA() }, "*");
    }
});