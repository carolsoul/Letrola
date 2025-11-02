// Define a URL base para todas as chamadas à API, facilitando futuras alterações.
const BASE_URL = `${import.meta.env.VITE_API_URL}`;
/**
 * [NOVA FUNÇÃO] Verifica se um jogador tem um progresso ativo para continuar.
 * É a primeira função a ser chamada após o login para decidir qual botão mostrar.
 * @param {number} jogadorId - O ID numérico do jogador.
 * @returns {Promise<boolean>} Retorna `true` se houver progresso ativo, `false` caso contrário.
 */
export async function verificarProgressoAtivo(jogadorId) {
  // Chama a rota GET /progresso/status/:id_jogador que criamos no backend.
  try {
    const response = await fetch(`${BASE_URL}/progresso/status/${jogadorId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao verificar progresso.');
    }
    // O backend retorna um objeto { tem_progresso: true } ou { tem_progresso: false }.
    return data.tem_progresso;
  } catch (error) {
    console.error('Erro na requisição para verificar progresso:', error);
    // Em caso de erro de comunicação com a API, assume-se que não há jogo para continuar.
    return false;
  }
}

/**
 * [NOVA FUNÇÃO] Inicia um novo jogo, arquivando todo o progresso ativo anterior.
 * @param {number} jogadorId - O ID numérico do jogador.
 * @returns {Promise<object>} A mensagem de sucesso do servidor.
 */
export async function iniciarNovoJogo(jogadorId) {
  // Chama a rota POST /progresso/novo-jogo.
  try {
    const response = await fetch(`${BASE_URL}/progresso/novo-jogo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_jogador: jogadorId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao iniciar novo jogo.');
    }
    return data;
  } catch (error) {
    console.error('Erro na requisição para iniciar novo jogo:', error);
    throw error;
  }
}

/**
 * Salva ou atualiza o progresso do jogador numa fase específica do jogo ATIVO.
 * @param {number} jogadorId - O ID numérico do jogador.
 * @param {number} mundo - O número do mundo.
 * @param {number} fase - O número da fase.
 * @param {number} estrelas - As estrelas ganhas (0-3).
 * @param {number} tempo_gasto - O tempo em segundos.
 * @returns {Promise<object>} A mensagem de sucesso do servidor.
 */
export async function salvarProgresso(jogadorId, mundo, fase, estrelas, tempo_gasto) {
  // Chama a rota POST /progresso/salvar-progresso.
  try {
    const response = await fetch(`${BASE_URL}/progresso/salvar-progresso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_jogador: jogadorId, mundo, fase, estrelas, tempo_gasto }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao salvar progresso.');
    }
    return data;
  } catch (error) {
    console.error('Erro na requisição para salvar progresso:', error);
    throw error;
  }
}

/**
 * Busca a fase mais avançada que o jogador pode aceder num mundo do seu jogo ATIVO.
 * @param {number} jogadorId - O ID numérico do jogador.
 * @param {number} mundoId - O ID do mundo a ser verificado.
 * @returns {Promise<number>} O número da próxima fase a ser jogada.
 */
export async function buscarFaseAtual(jogadorId, mundoId) {
  // Chama a rota GET /progresso/:id_jogador/:mundo_id.
  try {
    const response = await fetch(`${BASE_URL}/progresso/${jogadorId}/${mundoId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao buscar fase atual.');
    }
    return data.fase_atual;
  } catch (error) {
    console.error('Erro na requisição para buscar fase atual:', error);
    // Retorna 1 como padrão em caso de erro para não bloquear o jogo.
    return 1;
  }
}

/**
 * Busca o TOTAL de estrelas do jogo ATIVO de um jogador.
 * @param {number} jogadorId - O ID numérico do jogador.
 * @returns {Promise<number>} O total de estrelas acumuladas.
 */
export async function buscarTotalEstrelas(jogadorId) {
    // Chama a rota GET /progresso/total-estrelas/:id_jogador.
    try {
      const response = await fetch(`${BASE_URL}/progresso/total-estrelas/${jogadorId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar total de estrelas.');
      }
      return data.total_estrelas || 0;
    } catch (error) {
      console.error('Erro na requisição para buscar total de estrelas:', error);
      return 0;
    }
}

/**
 * Busca o número de estrelas de um jogador numa fase específica do jogo ATIVO.
 * @param {number} jogadorId - O ID numérico do jogador.
 * @param {number} mundoId - O ID do mundo.
 * @param {number} faseId - O ID da fase.
 * @returns {Promise<number>} O número de estrelas (0-3).
 */
export async function buscarEstrelas(jogadorId, mundoId, faseId) {
  // Chama a rota GET /progresso/estrelas/:id_jogador/:mundo/:fase.
  try {
    const response = await fetch(`${BASE_URL}/progresso/estrelas/${jogadorId}/${mundoId}/${faseId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error('Erro ao buscar estrelas.');
    }
    return data.estrelas || 0;
  } catch (error) {
    console.error('Erro na requisição para buscar estrelas:', error);
    return 0;
  }
}