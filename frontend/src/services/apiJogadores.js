// A URL base da sua API. Altere se o seu back-end estiver rodando em outro endereço.
const BASE_URL = `${import.meta.env.VITE_API_URL}/jogadores`;
/**
 * Cria um novo jogador no banco de dados.
 * @param {string} nome - O nome do jogador a ser criado.
 * @returns {Promise<object>} O objeto do jogador criado (ex: { id: 1, nome: 'Matheus' }).
 * @throws {Error} Lança um erro se o nome já existir ou se houver outro problema na requisição.
 */
export async function criarJogador(nome) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nome }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Lança um erro com a mensagem vinda da API (ex: "Este nome de jogador já está em uso.")
    throw new Error(data.error || 'Não foi possível criar o jogador.');
  }

  return data;
}

/**
 * Busca um jogador pelo nome.
 * @param {string} nome - O nome do jogador a ser buscado.
 * @returns {Promise<object>} O objeto do jogador encontrado.
 * @throws {Error} Lança um erro se o jogador não for encontrado.
 */
export async function buscarJogador(nome) {
  const response = await fetch(`${BASE_URL}/${nome}`);

  const data = await response.json();

  if (!response.ok) {
    // Lança um erro se a resposta for 404 (Não encontrado) ou outro erro.
    throw new Error(data.error || 'Não foi possível buscar o jogador.');
  }

  return data;
}