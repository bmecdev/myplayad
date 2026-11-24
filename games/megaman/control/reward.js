/**
 * MyPlayAd - Módulo Unificado de Premios y Captación de Leads (Multi-tenant)
 * Se ejecuta automáticamente al finalizar la partida en el controlador móvil.
 */

let rewardCountdownInterval = null;

async function checkAndDisplayReward(finalScore, gameSlug = 'arcade') {
    const urlParams = new URLSearchParams(window.location.search);
    const screenId = urlParams.get('screenId');
    if (!screenId) return;

    const rewardSection = document.getElementById('reward-section');
    const rewardDescText = document.getElementById('reward-desc-text');
    const rewardClaimForm = document.getElementById('reward-claim-form');
    const rewardCodeBox = document.getElementById('reward-code-box');
    const rewardCodeValue = document.getElementById('reward-code-value');
    const rewardCountdown = document.getElementById('reward-countdown');
    const leadNameInput = document.getElementById('lead-name');

    if (!rewardSection || !rewardClaimForm) return;

    try {
        const isDev = typeof window !== 'undefined' && (
            window.location.hostname.includes('dev') || 
            window.location.hostname.includes('staging') ||
            window.location.hostname.includes('test')
        );
        const portalUrl = isDev ? 'https://dev-portal.myplayad.com' : 'https://portal.myplayad.com';

        const res = await fetch(`${portalUrl}/api/public/screens/${screenId}/current`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.reward && data.reward.enabled && finalScore >= data.reward.minScore) {
            rewardSection.style.display = 'block';
            rewardDescText.innerHTML = `Por alcanzar <strong>${finalScore} pts</strong> (mínimo ${data.reward.minScore} pts), ganaste: <br><span style="color: #ffb703; font-size: 16px;">${data.reward.title}</span>`;
            
            const currentNick = typeof nickname !== 'undefined' ? nickname : (urlParams.get('nick') || '');
            if (leadNameInput && currentNick && currentNick !== 'Player' && currentNick !== 'PILOT') {
                leadNameInput.value = currentNick;
            }

            // Manejar envío del formulario de reclamo
            rewardClaimForm.onsubmit = async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('lead-submit-btn');
                const name = document.getElementById('lead-name').value.trim();
                const email = document.getElementById('lead-email').value.trim();
                const whatsapp = document.getElementById('lead-whatsapp').value.trim();
                const terms = document.getElementById('lead-terms').checked;

                if (!terms) {
                    alert('Debes aceptar los términos y tratamiento de datos para continuar.');
                    return;
                }

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'GENERANDO CÓDIGO...';
                }

                try {
                    const claimRes = await fetch(`${portalUrl}/api/rewards/claim`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            screenId,
                            gameSlug,
                            score: finalScore,
                            name,
                            email,
                            whatsapp,
                            termsAccepted: true
                        })
                    });

                    const claimData = await claimRes.json();
                    if (!claimRes.ok) {
                        alert(claimData.error || 'Error al reclamar el premio');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'OBTENER CÓDIGO DE RECLAMO';
                        }
                        return;
                    }

                    // Éxito: ocultar formulario y mostrar código con temporizador regresivo en vivo
                    rewardClaimForm.style.display = 'none';
                    rewardCodeBox.style.display = 'block';
                    rewardCodeValue.textContent = claimData.code;

                    const expiresAt = new Date(claimData.expiresAt).getTime();
                    if (rewardCountdownInterval) clearInterval(rewardCountdownInterval);

                    rewardCountdownInterval = setInterval(() => {
                        const now = Date.now();
                        const distance = expiresAt - now;

                        if (distance <= 0) {
                            clearInterval(rewardCountdownInterval);
                            rewardCountdown.textContent = 'EXPIRADO';
                            rewardCountdown.style.color = '#ff4d6d';
                        } else {
                            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                            rewardCountdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                        }
                    }, 1000);

                } catch (err) {
                    console.error('Error reclamando premio:', err);
                    alert('Error de conexión al reclamar el premio');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'OBTENER CÓDIGO DE RECLAMO';
                    }
                }
            };
        }
    } catch (e) {
        console.warn('No se pudo verificar el premio:', e);
    }
}
