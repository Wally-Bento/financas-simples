# 💰 Finanças — Controle Financeiro da Família

![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6+-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-Android_&_Web-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

Aplicativo mobile-first de gestão financeira pessoal e familiar, projetado para registrar gastos em segundos com uma mão, acompanhar metas detalhadas por item e funcionar **100% offline** tanto no **Android** (APK nativo) quanto no **iPhone / iOS** (Web App / PWA).

🔗 **Acesse a versão Web / iOS:** [wally-bento.github.io/financas-simples](https://wally-bento.github.io/financas-simples/)

---

## 🎯 Para que o projeto foi criado

A maioria dos aplicativos financeiros exige cadastro em servidores externos, conexão bancária ou categorização genérica demais (onde tudo vira apenas *"Mercado"* ou *"Farmácia"*), dificultando saber exatamente onde o orçamento da casa está pesando.

O **Finanças** foi criado para resolver três dores reais do dia a dia familiar:

1. **Controle granular por item específico:** Saber não apenas quanto foi gasto na categoria *Higiene* ou *Alimentação*, mas exatamente quanto foi gasto com *Lenço*, *Fralda*, *Pomada* ou *Mercado* dentro do mês.
2. **Privacidade total (Local-First):** Nenhum dado financeiro é enviado para nuvem, banco de dados ou API de terceiros. Tudo fica armazenado exclusivamente na memória do aparelho do usuário.
3. **Agilidade no uso diário:** Registrar uma compra no caixa do supermercado precisa levar menos de 5 segundos, usando atalhos de categoria, itens pré-cadastrados e soma rápida de valores.

---

## 🏗️ Como o projeto foi projetado (Arquitetura)

O sistema foi desenhado sobre o conceito de **código-fonte único (Single Codebase)** com empacotamento duplo via **GitHub Actions**:

```text
                        ┌───────────────────────────────┐
                        │     Código Único (React)      │
                        │   Vite + Tailwind + Lucide    │
                        └───────────────┬───────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
        ┌───────────────────────────────┐ ┌───────────────────────────────┐
        │     Capacitor (Android)       │ │    GitHub Pages (Web / iOS)   │
        │  Filesystem + Share Nativos   │ │   PWA Tela Cheia no Safari    │
        └───────────────┬───────────────┘ └───────────────┬───────────────┘
                        ▼                               ▼
                 📦 app-debug.apk                 🌐 App na Tela de Início
```

### Principais Decisões Técnicas

* **PWA Offline de Verdade (`vite-plugin-pwa`):**
  * Um *service worker* guarda o app no aparelho, então ele abre sem internet no iPhone e no navegador; o `manifest` permite instalar na Tela de Início com ícone e tela cheia.
  * O app se atualiza sozinho quando uma nova versão é publicada no GitHub Pages.
* **Armazenamento Local (`localStorage`) com Precisão em Centavos:**
  * Todos os valores monetários são convertidos e armazenados como **inteiros em centavos (`cents`)**, evitando erros clássicos de arredondamento de ponto flutuante (`0.1 + 0.2 !== 0.3`) em JavaScript.
  * Versionamento de chaves (`v1`, `v2`, `v3`) com migração automática de dados antigos sem perda de histórico.
* **Orçamento em Dois Níveis (Bottom-Up):**
  * Em vez de chutar um teto genérico por categoria, o usuário define a meta mensal de cada **item** (ex.: *Lenço* = R$ 80,00; *Fralda* = R$ 200,00) e o sistema consolida automaticamente o teto da **categoria** (*Higiene* = R$ 280,00).
  * Com base no orçamento total (ou nas receitas do mês) e nos dias restantes, o card principal calcula dinamicamente **quanto você ainda pode gastar no mês** e o **limite diário recomendado para hoje**.
* **Portabilidade Completa de Dados:**
  * **Backup Completo (`.json`):** Exporta e restaura o estado integral do aplicativo — lançamentos, categorias criadas pelo usuário (cores, ícones e listas de itens), metas por item e histórico de dias sem gasto.
  * **Planilha (`.csv`):** Exportação compatível com Excel e Google Planilhas (codificação `UTF-8 com BOM` e separador `;`).
  * **Importação Inteligente (`.json`, `.csv` e `.ofx`):** Lê extratos bancários `.ofx`, aprende associações anteriores entre descrição e categoria e permite escolher entre *Substituir tudo* ou *Mesclar sem duplicar*.
  * **Importação Segura:** O conteúdo do `.json` é validado antes de entrar (datas, tipos, valores, categorias, cores e ícones); itens inválidos são descartados e contados na tela de confirmação. O botão *Desfazer* restaura lançamentos, categorias, metas e dias sem gasto.
  * **Integração Nativa Android:** Utiliza `@capacitor/filesystem` e `@capacitor/share` para abrir a folha nativa de compartilhamento do Android (Google Drive, WhatsApp, Arquivos), com fallback automático para download web.
* **Interface Adaptativa e Ergonomia Mobile:**
  * Barra de navegação inferior fixa com **botão central flutuante (`+`)** otimizado para alcance do polegar.
  * Cabeçalho e navegação com efeito translúcido (*glassmorphism*), respeito às áreas seguras (`env(safe-area-inset-*)`), **Modo Escuro / Claro** e **3 paletas de cores** intercambiáveis (*Esmeralda*, *Violeta* e *Oceano*).

---

## ✨ Funcionalidades

### 📊 Tela Inicial (`Início`)
* **Cartão de Limite Disponível:** Mostra em tempo real quanto ainda pode ser gasto no mês, barra de progresso do orçamento diário e contador de ofensiva (`🔥 dias seguidos` registrando).
* **Resumo Financeiro:** Saldo acumulado geral, saldo do mês, total de receitas e total de despesas.
* **Check-in Diário e Lembrete:** Botão *"Hoje não gastei"* para manter a sequência nos dias sem compras e gerador de evento recorrente na agenda do celular (`.ics`).
* **Histórico Inteligente:** Busca instantânea por item ou categoria, filtros por tipo, repetição de lançamento em 1 toque, edição e exclusão com opção de **Desfazer**.

### ⚡ Lançamento Rápido (`+`)
* Teclado numérico com atalhos de soma rápida (`+10`, `+20`, `+50`, `+100`).
* Seleção visual de categoria e sugestões automáticas de itens (novos itens digitados são aprendidos automaticamente pela categoria).
* **Parcelamento automático (`2x` a `12x`):** Distribui as parcelas nos meses seguintes (`1/3`, `2/3`, `3/3`) ajustando eventual diferença de centavos na primeira parcela. As parcelas ficam agrupadas: ao excluir uma, você escolhe entre *só esta*, *esta e as próximas* ou *todas*.

### 📈 Painel Analítico (`Gráficos`)
* **Indicadores-chave:** Taxa de economia do mês, média diária de gastos, categoria mais pesada e item mais caro.
* **Evolução de 6 Meses:** Gráfico de barras comparativo entre **Receitas × Despesas** interativo ao toque.
* **Distribuição por Categoria:** Gráfico de rosca interativo que, ao ser tocado, abre o detalhamento de gastos por item dentro daquela categoria comparado às respectivas metas.
* **Top 5 Itens:** Ranking dos 5 itens específicos que mais consumiram o orçamento no mês.

### 🎯 Metas em Dois Níveis (`Metas`)
* **1. Definir por Itens:** Definição de teto mensal por item com barra de progresso individual e botão `+` para lançar um gasto já vinculado ao item.
* **2. Total por Categoria:** Visão consolidada da soma das metas por categoria e sua composição detalhada.

### 🗂️ Gerenciador Livre (`Categorias`)
* Criação, edição e exclusão de categorias de **Despesa** e **Receita**. Ao excluir uma categoria, seus lançamentos são movidos para "Outros..." (e dá para desfazer).
* Personalização de **cor**, **ícone** (21 opções) e gerenciamento rápido dos **itens** pertencentes a cada grupo.

---

## 📂 Estrutura do Repositório

```text
financas-simples/
├── .github/
│   └── workflows/
│       ├── build-android.yml     # Compila o projeto e gera o APK Android
│       └── deploy-pages.yml      # Publica a versão Web / iOS no GitHub Pages
├── public/                       # Ícones do PWA, favicon e apple-touch-icon
├── src/
│   ├── lib/
│   │   ├── finance.js            # Funções puras: dinheiro, datas, CSV, validação de backup
│   │   └── finance.test.js       # Testes unitários (Vitest)
│   ├── App.jsx                   # Interface e regras de negócio
│   ├── main.jsx                  # Ponto de entrada React
│   └── index.css                 # Diretivas Tailwind CSS
├── capacitor.config.json         # Configuração do app nativo Android (com.wallybento.financas)
├── index.html                    # Metatags PWA, tema e suporte tela cheia iOS
├── package.json                  # Dependências e scripts (dev, build, test)
└── vite.config.js                # Vite + Tailwind + PWA (base: './')
```

---

## 📱 Como Instalar nos Celulares

### Android (via APK do GitHub Actions)
1. Acesse a aba **Actions** deste repositório e abra a execução mais recente de **Gerar APK Android** (com status verde ✔).
2. Role até a seção **Artifacts** e baixe o arquivo **`app-debug`**.
3. Extraia o `.zip` e instale o arquivo **`app-debug.apk`** no aparelho Android.

### iPhone / iOS (via Safari / GitHub Pages)
1. Abra o link **[https://wally-bento.github.io/financas-simples/](https://wally-bento.github.io/financas-simples/)** no navegador **Safari**.
2. Toque no ícone de **Compartilhar** (quadrado com seta para cima na barra inferior).
3. Selecione **Adicionar à Tela de Início** e confirme em **Adicionar**.
4. *(Recomendação iOS)*: Como o Safari pode limpar o armazenamento local de Web Apps que ficam mais de 7 dias seguidos sem serem abertos, utilize periodicamente o botão **Backup → Backup Completo (`.json`)** para manter uma cópia salva no iCloud Drive.

---

## 💻 Executando Localmente

```bash
# Requer Node.js 20 ou superior

# 1. Clonar o repositório
git clone https://github.com/Wally-Bento/financas-simples.git
cd financas-simples

# 2. Instalar as dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev

# 4. Rodar os testes
npm test

# 5. Gerar build de produção (opcional)
npm run build
```

---

## 🛡️ Privacidade e Segurança

* **Zero servidores:** Não há backend, autenticação ou coleta de telemetria.
* **Prevenção contra CSV Injection:** Células exportadas em `.csv` iniciadas por caracteres de fórmula (`=`, `+`, `-`, `@`) são sanitizadas automaticamente antes da gravação.
* **Portabilidade garantida:** O usuário é dono integral dos seus dados, podendo exportar e importar backups completos em formato aberto `.json` a qualquer momento.