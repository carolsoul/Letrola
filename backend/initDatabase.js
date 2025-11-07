const db = require('./db');

function criarTabelas() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    // Tabela de Jogadores (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS jogadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      nome TEXT NOT NULL UNIQUE,
      musica_mutada INTEGER DEFAULT 0,
      sfx_mutado INTEGER DEFAULT 0
      )
    `);

    // Tabela de Progresso (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS progresso (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      id_jogador INTEGER NOT NULL, 
      mundo INTEGER NOT NULL, 
      fase INTEGER NOT NULL, 
      estrelas INTEGER DEFAULT 0, 
      tempo_gasto INTEGER, 
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      ativo INTEGER NOT NULL DEFAULT 1, 
      UNIQUE(id_jogador, mundo, fase, ativo), 
      FOREIGN KEY (id_jogador) 
      REFERENCES jogadores(id)
      )
    `);

    // Tabela de Personagens (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS personagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL
        )
    `);

    // Tabela de Fases (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS fases (
      mundo INTEGER NOT NULL,
      fase INTEGER NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT, 
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (mundo, fase)
      )
    `);

    // Tabela de Diálogos (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS dialogos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mundo INTEGER NOT NULL, 
      fase INTEGER NOT NULL, 
      ordem INTEGER NOT NULL, 
      personagem_id INTEGER NOT NULL, 
      fala TEXT NOT NULL, 
      expressao TEXT, 
      FOREIGN KEY (personagem_id) 
      REFERENCES personagens(id), 
      FOREIGN KEY (mundo, fase) 
      REFERENCES fases(mundo, fase)
      )
    `);

    // Tabela de Itens (Mundos 1 e 2) (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS itens_fase (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mundo INTEGER NOT NULL,
      fase INTEGER NOT NULL,
      ordem INTEGER NOT NULL,
      resposta TEXT NOT NULL,
      letras TEXT NOT NULL,
      dica1 TEXT,
      dica2 TEXT,
      imagem_url TEXT,
      FOREIGN KEY (mundo, fase)
      REFERENCES fases(mundo, fase)
      )
    `);
    
    // Tabela de Cruzadinhas (Mundo 3) (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS cruzadinhas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mundo INTEGER NOT NULL,
        fase INTEGER NOT NULL,
        palavra TEXT NOT NULL,
        dica TEXT NOT NULL,
        posicao_x INTEGER NOT NULL,
        posicao_y INTEGER NOT NULL,
        orientacao TEXT NOT NULL,
        UNIQUE(mundo, fase, palavra)
      )
    `);
    
    // Tabela de Caça-Palavras (Mundo 4) (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS cacapalavras_palavras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mundo INTEGER NOT NULL,
        fase INTEGER NOT NULL,
        palavra TEXT NOT NULL,
        UNIQUE(mundo, fase, palavra)
      )
    `);
    
    // Tabela Jogo da Memória (Mundo 5) (sem alteração)
    db.run(`
      CREATE TABLE IF NOT EXISTS memoria_pares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mundo INTEGER NOT NULL,
        fase INTEGER NOT NULL,
        par_identificador TEXT NOT NULL,
        imagem_url TEXT NOT NULL,
        UNIQUE(mundo, fase, par_identificador)
      )
    `);
    
    // ▼▼▼ [NOVA TABELA] Para o Jogo de Matemática (Mundo Bônus) ▼▼▼
    db.run(`
      CREATE TABLE IF NOT EXISTS mundo6_desafios_matematicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mundo INTEGER NOT NULL,
        fase INTEGER NOT NULL,
        pergunta TEXT NOT NULL,
        resposta TEXT NOT NULL,
        UNIQUE(mundo, fase, pergunta)
      )
    `, (err) => {
      // Este callback agora é da NOVA ÚLTIMA TABELA
      if (err) {
        console.error("Erro ao criar tabela mundo6_desafios_matematicos:", err);
        return;
      }
      console.log("Tabelas criadas/verificadas com sucesso.");
      seedDatabase();
    });
  });
}

function seedDatabase() {
  db.get("SELECT COUNT(*) AS count FROM fases", (err, row) => {
    if (err) {
      console.error("Erro ao consultar a base de dados:", err);
      return;
    }
    if (row && row.count > 0) {
      console.log("A base de dados já contém dados, a inserção de teste foi ignorada.");
      return;
    }

    console.log("A inserir dados de teste...");

    const personagensData = [
        { id: 1, nome: 'Macaco' },
        { id: 2, nome: 'Urso Polar' },
        { id: 3, nome: 'Sapo' },
        { id: 4, nome: 'Tigrão' },
        { id: 5, nome: 'Faísca' }, // Nome da Raposa, do seu arquivo original
        { id: 6, nome: 'Guaxinim' } // <-- [NOVO] Personagem Bônus
    ];

    const fasesData = [
        // Mundos 1-4 (sem alteração)
        { mundo: 1, fase: 1, nome: 'Mundo 1 - Fase 1', descricao: 'Uva, Maçã e Pera' },
        { mundo: 1, fase: 2, nome: 'Mundo 1 - Fase 2', descricao: 'Côco, Caju e Limão' },
        { mundo: 1, fase: 3, nome: 'Mundo 1 - Fase 3', descricao: 'Manga, Mamão e Banana' },
        { mundo: 1, fase: 4, nome: 'Mundo 1 - Fase 4', descricao: 'Laranja, Abacate e Morango' },
        { mundo: 1, fase: 5, nome: 'Mundo 1 - Fase 5', descricao: 'Abacaxi, Melancia e Maracujá' },
        { mundo: 2, fase: 1, nome: 'Mundo 2 - Fase 1', descricao: 'Bebidas - Nível 1' },
        { mundo: 2, fase: 2, nome: 'Mundo 2 - Fase 2', descricao: 'Bebidas - Nível 2' },
        { mundo: 2, fase: 3, nome: 'Mundo 2 - Fase 3', descricao: 'Bebidas - Nível 3' },
        { mundo: 2, fase: 4, nome: 'Mundo 2 - Fase 4', descricao: 'Bebidas - Nível 4' },
        { mundo: 2, fase: 5, nome: 'Mundo 2 - Fase 5', descricao: 'Bebidas - Nível 5' },
        { mundo: 3, fase: 1, nome: 'Cruzadinha - Nível 1', descricao: 'Decorações Simples' },
        { mundo: 3, fase: 2, nome: 'Cruzadinha - Nível 2', descricao: 'Mais Decorações' },
        { mundo: 3, fase: 3, nome: 'Cruzadinha - Nível 3', descricao: 'Enfeitando Tudo' },
        { mundo: 3, fase: 4, nome: 'Cruzadinha - Nível 4', descricao: 'Brilho e Cor' },
        { mundo: 3, fase: 5, nome: 'Cruzadinha - Nível 5', descricao: 'A Grande Festa' },
        { mundo: 4, fase: 1, nome: 'Caça-Palavras - Nível 1', descricao: 'Sobremesas Fáceis' },
        { mundo: 4, fase: 2, nome: 'Caça-Palavras - Nível 2', descricao: 'Doces Gelados' },
        { mundo: 4, fase: 3, nome: 'Caça-Palavras - Nível 3', descricao: 'Clássicos da Vovó' },
        { mundo: 4, fase: 4, nome: 'Caça-Palavras - Nível 4', descricao: 'Muitas Delícias' },
        { mundo: 4, fase: 5, nome: 'Caça-Palavras - Nível 5', descricao: 'Banquete de Sobremesas' },
        
        // Fases do Mundo 5 (sem alteração)
        { mundo: 5, fase: 1, nome: 'Jogo da Memória - Nível 1', descricao: '4 Pares (Frutas)' },
        { mundo: 5, fase: 2, nome: 'Jogo da Memória - Nível 2', descricao: '6 Pares (Frutas)' },
        { mundo: 5, fase: 3, nome: 'Jogo da Memória - Nível 3', descricao: '8 Pares (Bebidas)' },
        { mundo: 5, fase: 4, nome: 'Jogo da Memória - Nível 4', descricao: '10 Pares (Bebidas)' },
        { mundo: 5, fase: 5, nome: 'Jogo da Memória - Nível 5', descricao: '12 Pares (Mix)' },

        // ▼▼▼ [NOVO] Fase Bônus Mundo 6 ▼▼▼
        { mundo: 6, fase: 1, nome: 'A Perseguição Matemática', descricao: 'Pegue o Guaxinim!' },
    ];

    const dialogosData = [
        // Mundos 1-4 (sem alteração)
        { mundo: 1, fase: 1, ordem: 1, personagem_id: 1, fala: 'Olá, bem-vindo ao Mundo 1!', expressao: 'feliz' },
        { mundo: 2, fase: 1, ordem: 1, personagem_id: 2, fala: 'Brrr! Bem-vindo ao meu mundo gelado!', expressao: 'feliz' },
        { mundo: 3, fase: 1, ordem: 1, personagem_id: 3, fala: 'Olá, amiguinho! Sou o Hebert, o sapo, e adoro um desafio!', expressao: 'feliz' },
        { mundo: 4, fase: 1, ordem: 1, personagem_id: 4, fala: 'Oi, eu sou o Tigrão! Me ajuda a encontrar as sobremesas escondidas?', expressao: 'feliz' },
        
        // Diálogo do Mundo 5
        { mundo: 5, fase: 1, ordem: 1, personagem_id: 5, fala: 'Olá! Eu sou a Faísca. Dizem que sou bem esperta... Vamos ver quem é mais rápido em achar os pares?', expressao: 'feliz' },
        
        // ▼▼▼ [NOVO] Diálogo Bônus Mundo 6 (Macaco explica a nova regra) ▼▼▼
        { mundo: 6, fase: 1, ordem: 1, personagem_id: 1, fala: 'O Guaxinim roubou o bolo! Para alcançá-lo, temos que ser mais espertos que ele! Resolva estas contas o mais rápido que puder!', expressao: 'bravo' },
    ];

    // Dados dos Mundos 1 e 2 (sem alteração)
    // O Mundo 6 não usará mais esta tabela.
    const itensPorFase = [
      { mundo: 1, fase: 1, nome: 'UVA', dica1: 'Começa com a letra U.', dica2: 'É uma palavra bem curta, com 3 letras.', imagem_url: '/uva.svg' },
      { mundo: 1, fase: 1, nome: 'MAÇÃ', dica1: 'É uma palavra com 4 letras.', dica2: 'Termina com o som de "Ã". Cuidado com o tio (~)!', imagem_url: '/maca.svg' },
      { mundo: 1, fase: 1, nome: 'PERA', dica1: 'Rima com a palavra "ERA".', dica2: 'Começa com a sílaba "PE".', imagem_url: '/pera.svg' },
      { mundo: 1, fase: 2, nome: 'COCO', dica1: 'A letra O aparece duas vezes.', dica2: 'Usa a letra C duas vezes.', imagem_url: '/coco.svg' },
      { mundo: 1, fase: 2, nome: 'CAJU', dica1: 'Termina com a letra U.', dica2: 'A primeira sílaba é "CA".', imagem_url: '/caju.svg' },
      { mundo: 1, fase: 2, nome: 'LIMÃO', dica1: 'Rima com a palavra "MÃO".', dica2: 'Tem um acento tio (~) na letra A.', imagem_url: '/limao.svg' },
      { mundo: 1, fase: 3, nome: 'MANGA', dica1: 'É uma palavra com 5 letras.', dica2: 'Termina com as letras G e A.', imagem_url: '/manga.svg' },
      { mundo: 1, fase: 3, nome: 'MAMÃO', dica1: 'Começa com a sílaba "MA".', dica2: 'Também rima com "MÃO".', imagem_url: '/mamao.svg' },
      { mundo: 1, fase: 3, nome: 'BANANA', dica1: 'Tem 6 letras e 3 delas são a letra A.', dica2: 'Termina com a sílaba "NA".', imagem_url: '/banana.svg' },
      { mundo: 1, fase: 4, nome: 'LARANJA', dica1: 'Começa com "LA" e termina com "JA".', dica2: 'A sílaba do meio é "RAN".', imagem_url: '/laranja.svg' },
      { mundo: 1, fase: 4, nome: 'ABACATE', dica1: 'É uma palavra com 4 sílabas.', dica2: 'Começa com a letra A.', imagem_url: '/abacate.svg' },
      { mundo: 1, fase: 4, nome: 'MORANGO', dica1: 'A sílaba do meio é "RAN".', dica2: 'Começa com "MO" e termina com "GO".', imagem_url: '/morango.svg' },
      { mundo: 1, fase: 5, nome: 'ABACAXI', dica1: 'Começa com "A" e termina com "I".', dica2: 'Escreve-se com X e não com CH.', imagem_url: '/abacaxi.svg' },
      { mundo: 1, fase: 5, nome: 'MELANCIA', dica1: 'Começa com a sílaba "ME".', dica2: 'A sílaba do meio é "LAN".', imagem_url: '/melancia.svg' },
      { mundo: 1, fase: 5, nome: 'MARACUJÁ', dica1: 'Usa a letra Jota (J).', dica2: 'Tem um acento agudo na última letra!', imagem_url: '/maracuja.svg' },
      { mundo: 2, fase: 1, nome: 'SUCO', dica1: 'Começa com a letra S.', dica2: 'É uma palavra com 4 letras e 2 sílabas.', imagem_url: '/suco.svg' },
      { mundo: 2, fase: 1, nome: 'LEITE', dica1: 'Começa com a letra L.', dica2: 'Termina com a sílaba "TE".', imagem_url: '/leite.svg' },
      { mundo: 2, fase: 1, nome: 'CAFÉ', dica1: 'Tem um acento agudo no final!', dica2: 'Rima com "PÉ".', imagem_url: '/cafe.svg' },
      { mundo: 2, fase: 2, nome: 'ÁGUA', dica1: 'Começa com a letra A e tem acento.', dica2: 'A segunda sílaba é "GUA".', imagem_url: '/agua.svg' },
      { mundo: 2, fase: 2, nome: 'VITAMINA', dica1: 'É uma palavra grande, com 8 letras!', dica2: 'Termina com a sílaba "NA".', imagem_url: '/vitamina.svg' },
      { mundo: 2, fase: 2, nome: 'LIMONADA', dica1: 'Começa com "LI" e termina com "DA".', dica2: 'Tem 4 sílabas.', imagem_url: '/limonada.svg' },
      { mundo: 2, fase: 3, nome: 'SUCO DE MORANGO', dica1: 'São três palavras separadas.', dica2: 'A última palavra é "MORANGO".', imagem_url: '/suco_morango.svg' },
      { mundo: 2, fase: 3, nome: 'IOGURTE', dica1: 'É uma palavra com 7 letras', dica2: 'Termina com a sílaba "TE".', imagem_url: '/iogurte.svg' },
      { mundo: 2, fase: 3, nome: 'CALDO DE CANA', dica1: 'São três palavras e a do meio é "DE".', dica2: 'A última palavra é "CANA".', imagem_url: '/caldo_de_cana.svg' },
      { mundo: 2, fase: 4, nome: 'RASPADINHA', dica1: 'É uma bebida gelada, feita com gelo.', dica2: 'Termina com a sílaba "NHA".', imagem_url: '/raspadinha.svg' },
      { mundo: 2, fase: 4, nome: 'ÁGUA DE COCO', dica1: 'A primeira palavra tem acento.', dica2: 'A última palavra é "COCO".', imagem_url: '/agua_de_coco.svg' },
      { mundo: 2, fase: 4, nome: 'ACHOCOLATADO', dica1: 'É uma palavra bem grande!', dica2: 'Começa com "A" e termina com "DO".', imagem_url: '/achocolatado.svg' },
      { mundo: 2, fase: 5, nome: 'REFRIGERANTE', dica1: 'A sílaba do meio é "GE".', dica2: 'Termina com "RANTE".', imagem_url: '/refrigerante.svg' },
      { mundo: 2, fase: 5, nome: 'CAPUCCINO', dica1: 'É uma bebida com café e leite.', dica2: 'Começa com as letras C e A juntas.', imagem_url: '/capuccino.svg' },
      { mundo: 2, fase: 5, nome: 'ENERGÉTICO', dica1: 'É uma bebida que dá energia.', dica2: 'Termina com a sílaba "CO".', imagem_url: '/energetico.svg' },
    ];

    // Dados do Mundo 3 (sem alteração)
    const cruzadinhasData = [
        { mundo: 3, fase: 1, palavra: 'FITA', dica: 'Usada para fazer laços em presentes.', x: 1, y: 0, orientacao: 'horizontal' },
        { mundo: 3, fase: 1, palavra: 'FLOR', dica: 'Colorida e perfumada, enfeita o jardim.', x: 1, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 1, palavra: 'BOLA', dica: 'Redonda e usada em muitas brincadeiras.', x: 0, y: 2, orientacao: 'horizontal' },
        { mundo: 3, fase: 2, palavra: 'VELA', dica: 'Tem fogo e vai no bolo.', x: 1, y: 0, orientacao: 'horizontal' },
        { mundo: 3, fase: 2, palavra: 'LAÇO', dica: 'Um nó bonito de fita.', x: 3, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 2, palavra: 'TOALHA', dica: 'Cobre a mesa da festa.', x: 1, y: 1, orientacao: 'horizontal' },
        { mundo: 3, fase: 2, palavra: 'CADEIRA', dica: 'Usamos para sentar.', x: 6, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 2, palavra: 'BANDEIRA', dica: 'Enfeite de papel pendurado.', x: 0, y: 5, orientacao: 'horizontal' },
        { mundo: 3, fase: 3, palavra: 'VASO', dica: 'Onde colocamos flores.', x: 1, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 3, palavra: 'ESTRELA', dica: 'Brilha no céu à noite.', x: 0, y: 2, orientacao: 'horizontal' },
        { mundo: 3, fase: 3, palavra: 'CESTA', dica: 'Guarda pães ou frutas.', x: 0, y: 1, orientacao: 'vertical' },
        { mundo: 3, fase: 3, palavra: 'BALÃO', dica: 'Enche de ar e voa na festa.', x: 5, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 3, palavra: 'FAIXA', dica: 'Escreve "Parabéns" na parede.', x: 6, y: 1, orientacao: 'vertical' },
        { mundo: 3, fase: 4, palavra: 'ALMOFADA', dica: 'Travesseiro fofo do sofá.', x: 2, y: 1, orientacao: 'horizontal' },
        { mundo: 3, fase: 4, palavra: 'CATAVENTO', dica: 'Gira quando o vento bate.', x: 2, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 4, palavra: 'QUADROS', dica: 'Fotos ou desenhos na parede.', x: 0, y: 3, orientacao: 'horizontal' },
        { mundo: 3, fase: 4, palavra: 'CARTAZ', dica: 'Papel grande com um desenho.', x: 2, y: 0, orientacao: 'horizontal' },
        { mundo: 3, fase: 4, palavra: 'LANTEJOULA', dica: 'Bolinha brilhante para roupa.', x: 0, y: 6, orientacao: 'horizontal' },
        { mundo: 3, fase: 4, palavra: 'COPO', dica: 'Usamos para beber suco.', x: 6, y: 5, orientacao: 'vertical' },
        { mundo: 3, fase: 4, palavra: 'MESA', dica: 'Onde apoiamos o prato.', x: 4, y: 5, orientacao: 'vertical' },
        { mundo: 3, fase: 5, palavra: 'DECORAÇÃO', dica: 'O ato de enfeitar um ambiente.', x: 3, y: 1, orientacao: 'horizontal' },
        { mundo: 3, fase: 5, palavra: 'BANDEIRINHAS', dica: 'Pequenas bandeiras de papel unidas por um cordão.', x: 0, y: 4, orientacao: 'horizontal' },
        { mundo: 3, fase: 5, palavra: 'ENFEITE', dica: 'Qualquer objeto usado para embelezar.', x: 4, y: 1, orientacao: 'vertical' },
        { mundo: 3, fase: 5, palavra: 'COLORIDO', dica: 'Que tem muitas cores.', x: 6, y: 0, orientacao: 'vertical' },
        { mundo: 3, fase: 5, palavra: 'PISCA', dica: 'Luz que acende e apaga.', x: 3, y: 0, orientacao: 'horizontal' },
        { mundo: 3, fase: 5, palavra: 'FLORIDO', dica: 'Que está coberto de flores.', x: 4, y: 3, orientacao: 'horizontal' },
        { mundo: 3, fase: 5, palavra: 'ARCO', dica: 'Estrutura curvada, muitas vezes com balões.', x: 1, y: 4, orientacao: 'vertical' }
    ];

    // Dados do Mundo 4 (sem alteração)
    const cacapalavrasData = [
        { mundo: 4, fase: 1, palavra: 'BOLO' }, { mundo: 4, fase: 1, palavra: 'PUDIM' }, { mundo: 4, fase: 1, palavra: 'TORTA' },
        { mundo: 4, fase: 2, palavra: 'COCADA' }, { mundo: 4, fase: 2, palavra: 'AÇAÍ' }, { mundo: 4, fase: 2, palavra: 'PICOLÉ' }, { mundo: 4, fase: 2, palavra: 'MANJAR' }, { mundo: 4, fase: 2, palavra: 'SORVETE' },
        { mundo: 4, fase: 3, palavra: 'CHOCOLATE' }, { mundo: 4, fase: 3, palavra: 'BOLINHO' }, { mundo: 4, fase: 3, palavra: 'BISCOITO' }, { mundo: 4, fase: 3, palavra: 'PAVÊ' }, { mundo: 4, fase: 3, palavra: 'PAÇOCA' },
        { mundo: 4, fase: 4, palavra: 'MOUSSE' }, { mundo: 4, fase: 4, palavra: 'BOMBOM' }, { mundo: 4, fase: 4, palavra: 'TAPIOCA' }, { mundo: 4, fase: 4, palavra: 'CHURROS' }, { mundo: 4, fase: 4, palavra: 'GELATINA' }, { mundo: 4, fase: 4, palavra: 'PANQUECA' }, { mundo: 4, fase: 4, palavra: 'ROCAMBOLE' },
        { mundo: 4, fase: 5, palavra: 'BANOFFE' }, { mundo: 4, fase: 5, palavra: 'CARAMELO' }, { mundo: 4, fase: 5, palavra: 'SUSPIRO' }, { mundo: 4, fase: 5, palavra: 'PANETONE' }, { mundo: 4, fase: 5, palavra: 'COOKIES' }, { mundo: 4, fase: 5, palavra: 'QUINDIM' }, { mundo: 4, fase: 5, palavra: 'PAMONHA' },
    ];
    
    // Dados do Mundo 5 (sem alteração)
    const memoriaData = [
        // Fase 1: 4 Pares (Frutas Mundo 1)
        { mundo: 5, fase: 1, id: 'UVA', img: '/uva.svg' },
        { mundo: 5, fase: 1, id: 'MAÇÃ', img: '/maca.svg' },
        { mundo: 5, fase: 1, id: 'PERA', img: '/pera.svg' },
        { mundo: 5, fase: 1, id: 'COCO', img: '/coco.svg' },
        // Fase 2: 6 Pares (Frutas Mundo 1)
        { mundo: 5, fase: 2, id: 'CAJU', img: '/caju.svg' },
        { mundo: 5, fase: 2, id: 'LIMÃO', img: '/limao.svg' },
        { mundo: 5, fase: 2, id: 'MANGA', img: '/manga.svg' },
        { mundo: 5, fase: 2, id: 'BANANA', img: '/banana.svg' },
        { mundo: 5, fase: 2, id: 'MORANGO', img: '/morango.svg' },
        { mundo: 5, fase: 2, id: 'LARANJA', img: '/laranja.svg' },
        // Fase 3: 8 Pares (Bebidas Mundo 2)
        { mundo: 5, fase: 3, id: 'SUCO', img: '/suco.svg' },
        { mundo: 5, fase: 3, id: 'LEITE', img: '/leite.svg' },
        { mundo: 5, fase: 3, id: 'CAFÉ', img: '/cafe.svg' },
        { mundo: 5, fase: 3, id: 'ÁGUA', img: '/agua.svg' },
        { mundo: 5, fase: 3, id: 'VITAMINA', img: '/vitamina.svg' },
        { mundo: 5, fase: 3, id: 'LIMONADA', img: '/limonada.svg' },
        { mundo: 5, fase: 3, id: 'IOGURTE', img: '/iogurte.svg' },
        { mundo: 5, fase: 3, id: 'REFRIGERANTE', img: '/refrigerante.svg' },
        // Fase 4: 10 Pares (Bebidas Mundo 2)
        { mundo: 5, fase: 4, id: 'SUCO DE MORANGO', img: '/suco_morango.svg' },
        { mundo: 5, fase: 4, id: 'CALDO DE CANA', img: '/caldo_de_cana.svg' },
        { mundo: 5, fase: 4, id: 'RASPADINHA', img: '/raspadinha.svg' },
        { mundo: 5, fase: 4, id: 'ÁGUA DE COCO', img: '/agua_de_coco.svg' },
        { mundo: 5, fase: 4, id: 'ACHOCOLATADO', img: '/achocolatado.svg' },
        { mundo: 5, fase: 4, id: 'CAPUCCINO', img: '/capuccino.svg' },
        { mundo: 5, fase: 4, id: 'ENERGÉTICO', img: '/energetico.svg' },
        { mundo: 5, fase: 4, id: 'CAFÉ', img: '/cafe.svg' },
        { mundo: 5, fase: 4, id: 'SUCO', img: '/suco.svg' },
        { mundo: 5, fase: 4, id: 'LEITE', img: '/leite.svg' },
        // Fase 5: 12 Pares (Mix Mundo 1 e 2)
        { mundo: 5, fase: 5, id: 'ABACAXI', img: '/abacaxi.svg' },
        { mundo: 5, fase: 5, id: 'MELANCIA', img: '/melancia.svg' },
        { mundo: 5, fase: 5, id: 'MARACUJÁ', img: '/maracuja.svg' },
        { mundo: 5, fase: 5, id: 'UVA', img: '/uva.svg' },
        { mundo: 5, fase: 5, id: 'BANANA', img: '/banana.svg' },
        { mundo: 5, fase: 5, id: 'MORANGO', img: '/morango.svg' },
        { mundo: 5, fase: 5, id: 'VITAMINA', img: '/vitamina.svg' },
        { mundo: 5, fase: 5, id: 'ÁGUA DE COCO', img: '/agua_de_coco.svg' },
        { mundo: 5, fase: 5, id: 'REFRIGERANTE', img: '/refrigerante.svg' },
        { mundo: 5, fase: 5, id: 'ENERGÉTICO', img: '/energetico.svg' },
        { mundo: 5, fase: 5, id: 'IOGURTE', img: '/iogurte.svg' },
        { mundo: 5, fase: 5, id: 'SUCO', img: '/suco.svg' },
    ];

    // ▼▼▼ [NOVOS DADOS] Para o Jogo de Matemática (Mundo 6) ▼▼▼
    const desafiosMatematicosData = [
        { mundo: 6, fase: 1, pergunta: 'Quanto é 2 + 2 ?', resposta: '4' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 5 + 3 ?', resposta: '8' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 4 - 1 ?', resposta: '3' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 10 - 5 ?', resposta: '5' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 3 x 2 ?', resposta: '6' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 5 x 2 ?', resposta: '10' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 2 + 8 ?', resposta: '10' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 9 - 2 ?', resposta: '7' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 4 + 4 ?', resposta: '8' },
        { mundo: 6, fase: 1, pergunta: 'Quanto é 3 x 3 ?', resposta: '9' },
    ];


    db.serialize(() => {
      // Inserir Personagens
      const stmtPersonagens = db.prepare("INSERT INTO personagens (id, nome) VALUES (?, ?)");
      personagensData.forEach(p => stmtPersonagens.run(p.id, p.nome));
      stmtPersonagens.finalize();

      // Inserir Fases
      const stmtFases = db.prepare("INSERT INTO fases (mundo, fase, nome, descricao) VALUES (?, ?, ?, ?)");
      fasesData.forEach(f => stmtFases.run(f.mundo, f.fase, f.nome, f.descricao));
      stmtFases.finalize();

      // Inserir Diálogos
      const stmtDialogos = db.prepare("INSERT INTO dialogos (mundo, fase, ordem, personagem_id, fala, expressao) VALUES (?, ?, ?, ?, ?, ?)");
      dialogosData.forEach(d => stmtDialogos.run(d.mundo, d.fase, d.ordem, d.personagem_id, d.fala, d.expressao));
      stmtDialogos.finalize();

      // Inserir Itens (Mundos 1 e 2)
      const stmtItens = db.prepare("INSERT INTO itens_fase (mundo, fase, ordem, resposta, letras, dica1, dica2, imagem_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      let ordemContador = {};
      itensPorFase.forEach((item) => {
        const chaveFase = `${item.mundo}-${item.fase}`;
        if (!ordemContador[chaveFase]) ordemContador[chaveFase] = 1;
        const pecasDoPuzzle = item.nome.split('');
        let pecasEmbaralhadas;
        do {
            pecasEmbaralhadas = [...pecasDoPuzzle].sort(() => 0.5 - Math.random());
        } while (pecasEmbaralhadas.join('') === item.nome && pecasDoPuzzle.length > 1);
        const jsonPecas = JSON.stringify(pecasEmbaralhadas.map(l => l.toUpperCase())); // Assegura que as letras embaralhadas estão em maiúsculas
        const ordem = ordemContador[chaveFase];
        stmtItens.run(item.mundo, item.fase, ordem, item.nome.toUpperCase(), jsonPecas, item.dica1, item.dica2, item.imagem_url);
        ordemContador[chaveFase]++;
      });
      stmtItens.finalize();

      // Inserir Cruzadinhas (Mundo 3)
      const stmtCruzadinhas = db.prepare("INSERT INTO cruzadinhas (mundo, fase, palavra, dica, posicao_x, posicao_y, orientacao) VALUES (?, ?, ?, ?, ?, ?, ?)");
      cruzadinhasData.forEach(item => {
        stmtCruzadinhas.run(item.mundo, item.fase, item.palavra.toUpperCase(), item.dica, item.x, item.y, item.orientacao); // Assegura que a palavra está em maiúsculas
      });
      stmtCruzadinhas.finalize();

      // Inserir Caça-Palavras (Mundo 4)
      const stmtCacapalavras = db.prepare("INSERT INTO cacapalavras_palavras (mundo, fase, palavra) VALUES (?, ?, ?)");
      cacapalavrasData.forEach(c => stmtCacapalavras.run(c.mundo, c.fase, c.palavra.toUpperCase())); // Assegura que a palavra está em maiúsculas
      stmtCacapalavras.finalize();
      
      // Inserir Pares do Jogo da Memória (Mundo 5)
      const stmtMemoria = db.prepare("INSERT INTO memoria_pares (mundo, fase, par_identificador, imagem_url) VALUES (?, ?, ?, ?)");
      memoriaData.forEach(m => stmtMemoria.run(m.mundo, m.fase, m.id.toUpperCase(), m.img)); // Assegura que o ID está em maiúsculas
      stmtMemoria.finalize();
      
      // ▼▼▼ [NOVA INSERÇÃO] Inserir Desafios de Matemática (Mundo 6) ▼▼▼
      const stmtDesafios = db.prepare("INSERT INTO mundo6_desafios_matematicos (mundo, fase, pergunta, resposta) VALUES (?, ?, ?, ?)");
      desafiosMatematicosData.forEach(d => stmtDesafios.run(d.mundo, d.fase, d.pergunta, d.resposta));
      stmtDesafios.finalize((err) => {
          if(!err) console.log("Dados de teste (incluindo Fase Bônus de Matemática) inseridos com sucesso.");
      });
    });
  });
}

module.exports = criarTabelas;