// Local: frontend/src/services/apiBonus.js

// Usa a variável de ambiente do Vite
const BASE_URL = `${import.meta.env.VITE_API_URL}/bonus`;

/**
 * Verifica o status de desbloqueio da fase bônus para um jogador.
 * @param {number} jogadorId - O ID do jogador.
 * @returns {Promise<object|null>} Um objeto com { desbloqueado, estrelas_coletadas, estrelas_necessarias } ou null.
 */
export async function verificarStatusBonus(jogadorId) {
  try {
    // Chama a rota GET /bonus/status/1 (por exemplo)
    const response = await fetch(`${BASE_URL}/status/${jogadorId}`);
    if (!response.ok) {
      throw new Error('Falha ao verificar status da fase bônus.');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em verificarStatusBonus:', error);
    return null;
  }
}