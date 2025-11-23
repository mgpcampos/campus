# Campus

Este repositório hospeda o código-fonte da aplicação desenvolvida para a disciplina **Projeto Integrador**.

### Integrantes do Grupo

| Nome Completo         | Prontuário |
| :---                  | :---       |
| Mateus G. P. Campos   | JC3019705  |
| Ray G. dos S. Martins | JC3019543  |
| Kauê M. de Araujo     | JC3019497  |
| Kevin L. R. de Candia | JC3018784  |

## Descrição do Projeto

**Campus** é um protótipo de rede social acadêmica que conecta estudantes, educadores, pesquisadores e gestores — sem a sistematicidade de um ambiente virtual de aprendizagem nem a dispersividade de redes sociais tradicionais. Um espaço curado para grupos de estudo, fóruns de discussão, eventos e recursos educacionais, onde o conhecimento flui com propósito e o encontro humano prevalece.

## Funcionalidades Principais

O sistema oferece um conjunto robusto de ferramentas para gerenciamento de comunidades:

*   **Interação Social:**  Feed de postagens, comentários, curtidas e compartilhamento de mídia.
*   **Espaços e Grupos:**  Organização hierárquica de comunidades em Espaços, subdivididos em Grupos temáticos.
*   **Calendário:**        Visualização de eventos e prazos importantes.
*   **Eventos:**           Criação e gerenciamento pessoal de eventos.
*   **Materiais:**         Repositório para compartilhamento de materiais didáticos ou recursos.
*   **Perfis Acadêmicos:** Detalhes acerca de formação, pesquisas e interesses acadêmicos.
*   **Perfis de Usuário:** Personalização de perfil e preferências (incluindo modo escuro).

## Conjunto de tecnologias, ferramentas e frameworks

A aplicação foi construída utilizando a seguinte pilha de tecnologias:

| Categoria                    | Tecnologia           | Descrição                                                                 |
| :---                         | :---                 | :---                                                                      |
| **Frontend**                 | Svelte 5 + SvelteKit | Framework reativo de última geração para interfaces web rápidas.          |
| **Estilização**              | Tailwind CSS v4      | Framework CSS utilitário para design responsivo e customizável.           |
| **Backend / Banco de Dados** | PocketBase           | Backend-as-a-Service de código aberto, leve e rápido (baseado em SQLite). |
| **Runtime**                  | Bun                  | Alternativa ao Node.js, utilizado como runtime JavaScript.                |
| **Componentes**              | Bits UI + Lucide     | Componentes de interface headless e ícones vetoriais.                     |
| **Validação**                | Zod + Superforms     | Validação de esquemas e gerenciamento robusto de formulários.             |

## Instalação e Execução

Siga os passos abaixo para configurar o ambiente de desenvolvimento.

### Pré-requisitos

*   [Bun](https://bun.com/) (Runtime JavaScript)
*   [PocketBase](https://pocketbase.io/) (Backend-as-a-Service)

### 1. Clonar o Repositório

```bash
git clone https://github.com/mgpcampos/campus.git
cd campus
```

### 2. Instalar Dependências

Utilize o Bun para instalar as dependências do projeto:

```bash
bun install
```

### 3. Configurar o Backend (PocketBase)

1.  Baixe o executável do PocketBase para o seu sistema operacional (disponível em https://pocketbase.io/docs/) e coloque-o na raiz do projeto.
2.  Inicie o servidor do PocketBase:

```bash
./pocketbase migrate
./pocketbase serve
```

Ao iniciar, o PocketBase aplicará automaticamente as migrações presentes na pasta `pb_migrations`, criando a estrutura do banco de dados necessária.

### 4. Iniciar o Frontend

Em um novo terminal, inicie o servidor de desenvolvimento:

```bash
bun run dev
```

A aplicação estará acessível em `http://localhost:5173`. Tanto o frontend quanto o backend devem estar simultaneamente em execução para que a aplicação funcione corretamente.

## Estrutura do Projeto

```
.
├── src/
│   ├── lib/            # Componentes reutilizáveis, utilitários e stores
│   ├── routes/         # Rotas da aplicação (SvelteKit File-based routing)
│   └── app.html        # Template HTML principal
├── pb_migrations/      # Migrações do banco de dados PocketBase (JS)
├── pb_hooks/           # Hooks do lado do servidor do PocketBase
├── static/             # Arquivos estáticos públicos
├── package.json        # Dependências e scripts do projeto
└── ...
```