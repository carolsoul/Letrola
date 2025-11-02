// 1. Pega a URL base do seu arquivo .env
const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Busca todos os itens (e as letras associadas) de uma fase específica.
 * @param {number} mundo O número do mundo cujos itens devem ser buscados.
 * @param {number} fase O número da fase cujos itens devem ser buscados.
 * @returns {Promise<Array<object>>} Uma lista de objetos de itens.
 */
async function buscarItensPorFase(mundo, fase) {
  try {
    // 2. A URL agora é dinâmica, usando a variável de ambiente
    const response = await fetch(
      `${API_BASE_URL}/itens-fase/${mundo}/${fase}`
    ); // A rota pode retornar 400 (ID inválido) ou 404 (nenhum item encontrado)
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || errorData.message || "Erro ao buscar itens da fase."
      );
    }

    const data = await response.json();
    console.log(`Itens encontrados para a fase ${mundo}.${fase}:`, data.length);
    return data;
  } catch (error) {
    console.error("Erro na requisição:", error);
    throw error;
  }
}

// Exporta a função para que possa ser importada e usada em outros arquivos
export { buscarItensPorFase };