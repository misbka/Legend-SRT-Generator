# 🎬 Legendário — Gerador de Legendas SRT

Estúdio completo para criar legendas **.srt** com sincronismo em tempo real:
você dá play no vídeo/áudio e aperta **Espaço** exatamente no momento em que
cada legenda deve aparecer. No fim, salva o arquivo onde quiser.

100% offline, sem instalação e sem servidor — funciona direto no navegador.

---

## ▶ Como usar

**Opção A (mais fácil):** dê dois cliques em **`iniciar.bat`**.

**Opção B:** abra o `index.html` com Chrome, Edge ou Firefox
(arrastando para a janela do navegador ou pelo menu *Abrir arquivo*).

> 💡 Não é preciso instalar nada. O app roda 100% no seu computador e
> nenhum arquivo é enviado para a internet.

---

## 🧭 Fluxo de trabalho (4 etapas)

| Etapa | O que fazer |
|---|---|
| **1. Mídia** | Arraste ou selecione um **vídeo ou áudio** (MP4, WebM, MOV, MP3, WAV, M4A, OGG…) |
| **2. Roteiro** | Cole o texto ou importe um arquivo **.txt** — **uma linha = uma legenda** |
| **3. Sincronizar** | Aperte **▶ Iniciar sincronismo**, dê play e **aperte Espaço** na hora certa de cada linha |
| **4. Exportar** | Revise/corrija no **Editor** e clique em **Salvar arquivo .SRT** |

---

## ⌨️ Atalhos do teclado

| Tecla | Durante o sincronismo | Fora do sincronismo |
|---|---|---|
| **Espaço** | Marca o início da legenda atual / fecha a atual e abre a próxima | Play / Pause |
| **Enter** | Encerra a legenda atual e **pausa** a mídia (para reposicionar) | — |
| **Backspace / Delete** | Desfaz a última marcação | — |
| **← / →** | Volta ou avança 5 segundos | Volta ou avança 5 segundos |

### Como funciona a marcação por Espaço

```
Espaço 1  →  grava o INÍCIO da legenda 1 (e dá play se estiver pausado)
Espaço 2  →  encerra a legenda 1 e inicia a legenda 2 no mesmo instante
Espaço 3  →  encerra a legenda 2 e inicia a legenda 3
...
```

O **intervalo entre legendas** (campo no passo 2) deixa um respiro
(80 ms por padrão) para uma legenda não grudar na outra.

---

## ✏️ Recursos

- ▶ Play / pause, ±5 s, barra de progresso, volume, **velocidade** (0,5×–2×) e tela cheia
- 📄 Importação de `.txt` por arrastar-e-soltar ou seleção de arquivo
- 🔴 Painel de sincronismo ao vivo: linha atual, próximas linhas, barra de progresso
- 👁️ Prévia da legenda sobre o vídeo em tempo real
- 🛠️ **Editor completo**: corrigir texto, ajustar tempos, reordenar, ouvir a partir de um ponto, excluir legendas
- ✨ **Auto-ajustar tempos**: completa fins ausentes/inválidos (usa o início da próxima legenda)
- 🎛️ **Linha do tempo estilo CapCut**: cada legenda vira um bloco proporcional à duração —
  clique para ir até ela, **arraste o corpo** para mover e **arraste as bordas** para ajustar
  início/fim com prévia ao vivo, encaixe automático (playhead e legendas vizinhas), régua de
  tempos, playhead que acompanha a reprodução e zoom (inclusive com `Ctrl` + rolagem)
- ↶ Desfazer marcações durante o sincronismo
- 💾 **Salvar .SRT** no local escolhido pelo sistema (ou na pasta de downloads) e **copiar para a área de transferência**
- 🏷️ Indicador das 4 etapas no topo

---

## 📂 Estrutura do projeto

O código é **modular**: cada responsabilidade vive no seu próprio arquivo.

```
gerador_de_legendas/
├── index.html                 # Estrutura da interface
├── iniciar.bat                # Atalho para abrir o app
├── css/
│   ├── base.css               # Variáveis, reset, tipografia, animações
│   ├── layout.css             # Estrutura: topbar, etapas, grid, abas, responsivo
│   ├── components.css         # Botões, player, sincronismo, editor, toasts
│   └── timeline.css           # Linha do tempo de legendas (blocos, régua, playhead)
└── js/
    ├── utils.js               # Formatação de tempo SRT, parse, helpers DOM
    ├── store.js               # Estado central + eventos (pub/sub)
    ├── main.js                # Inicialização de todos os módulos
    ├── keyboard.js            # Atalhos globais (Espaço, Enter, Backspace…)
    ├── steps.js               # Indicador das 4 etapas
    ├── overlay.js             # Legenda exibida sobre o vídeo
    ├── ui/
    │   ├── icons.js           # Ícones SVG
    │   ├── toast.js           # Notificações
    │   └── tabs.js            # Abas do painel lateral
    ├── media/
    │   └── player.js          # Carga e reprodução de vídeo/áudio
    ├── text/
    │   └── scriptInput.js     # Roteiro: texto colado + arquivos .txt
    ├── sync/
    │   └── synchronizer.js    # Sincronismo em tempo real (núcleo)
    ├── editor/
    │   └── cueEditor.js       # Revisão e edição das legendas
    ├── timeline/
    │   └── timeline.js        # Linha do tempo visual (arrastar blocos e bordas)
    └── export/
        └── srt.js             # Geração e gravação do arquivo .SRT
```

### Comunicação entre módulos

Nenhum módulo acessa o outro diretamente de forma acoplada: todos leem e
escrevem no **`App.Store`** (estado compartilhado) e reagem a eventos
(`media`, `lines`, `cues`, `sync`, `tick`, `playing`, `exported`…).
Isso mantém o app desacoplado e fácil de evoluir.

---

## 📄 Formato gerado

```srt
1
00:00:00,500 --> 00:00:02,920
Primeira legenda

2
00:00:03,100 --> 00:00:06,480
Segunda legenda
```

Compatível com YouTube, Vimeo, Players, Premiere, DaVinci Resolve,
VLC e a maioria dos editores.

---

## 🧩 Compatibilidade

- **Navegadores:** Chrome, Edge, Opera e Firefox (recomendado: Chrome/Edge)
- **Mídia:** codecs suportados pelo próprio navegador (MP4/H.264, WebM, MP3, WAV, M4A, OGG)
- **Salvar arquivo:** no Chrome/Edge abre o diálogo nativo *"Salvar como"*
  (você escolhe a pasta); em navegadores sem esse recurso, baixa para a
  pasta de downloads
