/**
 * PX MANAGER - Background Script
 * IA + Sistema de Notificações de Atualização
 */

// 1. ESCUTAR MENSAGENS DA IA (Seu código atual)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CHAMAR_IA") {
        fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": "Bearer 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", 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-72B-Instruct-AWQ",
                temperature: 1.3,
                messages: request.messages
            })
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true; 
    }
});

// 2. MONITORAR ATUALIZAÇÕES DISPONÍVEIS
chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log("Nova versão encontrada: " + details.version);

    // Cria a notificação no Windows/Chrome
    chrome.notifications.create('px-update-notify', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'PX MANAGER - Nova Versão!',
        message: `A versão ${details.version} está disponível. Clique aqui para atualizar agora.`,
        contextMessage: 'Sua produtividade agradece!',
        priority: 2,
        requireInteraction: true // A notificação fica fixa até o usuário clicar
    });
});

// 3. AGIR AO CLICAR NA NOTIFICAÇÃO
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'px-update-notify') {
        // Recarrega a extensão e aplica a nova versão imediatamente
        chrome.runtime.reload();
    }
});