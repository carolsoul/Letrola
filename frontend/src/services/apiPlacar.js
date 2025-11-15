// Local: frontend/src/services/apiPlacar.js

// Usa a variável de ambiente do Vite
const BASE_URL = `${import.meta.env.VITE_API_URL}/placar`;

/**
 * Busca a lista do Top 10 de jogadores e suas estrelas.
 * @returns {Promise<Array<object>|null>} Um array de { nome, total_estrelas } ou null.
 */
export async function buscarPlacar() {
  try {
    // Chama a rota GET /placar
    const response = await fetch(`${BASE_URL}/`);
    if (!response.ok) {
      throw new Error('Falha ao buscar o placar.');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em buscarPlacar:', error);
    return null;
  }
}