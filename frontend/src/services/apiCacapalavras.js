// A URL base do seu servidor backend.
const BASE_URL = `${import.meta.env.VITE_API_URL}/cacapalavras`;
/**
 * Busca a lista de palavras para um nível específico do caça-palavras.
 * @param {number} mundo - O número do mundo (ex: 4).
 * @param {number} fase - O número da fase (ex: 1).
 * @returns {Promise<string[]|null>} Um array com as palavras ou null em caso de erro ou resposta vazia.
 */
export async function buscarPalavrasDoNivel(mundo, fase) {
  const url = `${BASE_URL}/${mundo}/${fase}`;
  console.log(`[Frontend] Buscando palavras de: ${url}`); // Log 1 (URL)
  try {
    const response = await fetch(url, {
        // Adiciona cache: 'no-store' para tentar evitar o cache 304 em desenvolvimento,
        // mas a limpeza manual via DevTools é mais garantida.
        cache: 'no-store'
    });
    console.log(`[Frontend] Status da resposta: ${response.status}`); // Log 2 (Status)

    // Verifica se a resposta foi bem-sucedida (status 2xx)
    if (!response.ok) {
        // Se o status for 304, ainda tentamos ler o corpo (pode ser útil se o cache estiver ok)
        // Se for outro erro (404, 500), lançamos um erro.
        if (response.status !== 304) {
             console.error(`[Frontend] Erro ${response.status} ao buscar palavras.`);
             throw new Error(`Falha ao buscar palavras: ${response.statusText}`);
        }
    }

    const data = await response.json();
    console.log(`[Frontend] Dados recebidos:`, data); // Log 3 (Dados)

    // Verifica se data é um array e tem conteúdo antes de retornar
    if (Array.isArray(data) && data.length > 0) {
        return data; // Ex: ["BOLO", "PUDIM", "TORTA"]
    } else {
        // Se for um array vazio ou não for um array, considera como falha
        console.warn('[Frontend] API retornou dados vazios ou inválidos para palavras.');
        return null; // Retorna null para indicar falha ao componente
    }

  } catch (error) {
    console.error('[Frontend] Erro em buscarPalavrasDoNivel:', error); // Log 4 (Erro Fetch/JSON)
    return null;
  }
}

/**
 * Valida uma palavra encontrada pelo jogador.
 * @param {object} dadosValidacao - Um objeto com os dados para validação.
 * @param {number} dadosValidacao.mundo - O número do mundo atual.
 * @param {number} dadosValidacao.fase - O número da fase atual.
 * @param {string} dadosValidacao.palavra - A palavra encontrada pelo jogador.
 * @returns {Promise<object|null>} Um objeto com { correta: boolean } ou null em caso de erro.
 */
export async function validarPalavraEncontrada(dadosValidacao) {
  try {
    const response = await fetch(`${BASE_URL}/validar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadosValidacao),
    });

    if (!response.ok) {
      throw new Error('Falha ao validar a palavra.');
    }
    return await response.json(); // Ex: { correta: true }
  } catch (error) {
    console.error('Erro em validarPalavraEncontrada:', error);
    return null;
  }
}