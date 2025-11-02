// Local: src/api/apiSettings.js (ou onde você preferir)

// A URL base do seu servidor backend.
// Mude para o endereço do seu servidor de produção quando for o caso.
const BASE_URL = `${import.meta.env.VITE_API_URL}/settings`;

/**
 * Busca as configurações de áudio de um jogador específico.
 * @param {number} idJogador O ID do jogador.
 * @returns {Promise<object|null>} Um objeto com { musica_mutada, sfx_mutado } ou null em caso de erro.
 */
export async function buscarConfiguracoesDeAudio(idJogador) {
  try {
    const response = await fetch(`${BASE_URL}/${idJogador}`);
    if (!response.ok) {
      throw new Error('Falha ao buscar configurações de áudio.');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em buscarConfiguracoesDeAudio:', error);
    return null;
  }
}

/**
 * Salva as configurações de áudio de um jogador.
 * @param {object} configuracoes - Um objeto contendo os dados a serem salvos.
 * @param {number} configuracoes.id_jogador - O ID do jogador.
 * @param {boolean} configuracoes.musica_mutada - O estado do áudio da música (true para mudo).
 * @param {boolean} configuracoes.sfx_mutado - O estado dos efeitos sonoros (true para mudo).
 * @returns {Promise<object|null>} Um objeto com a mensagem de sucesso ou null em caso de erro.
 */
export async function salvarConfiguracoesDeAudio(configuracoes) {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configuracoes),
    });

    if (!response.ok) {
      throw new Error('Falha ao salvar configurações de áudio.');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em salvarConfiguracoesDeAudio:', error);
    return null;
  }
}