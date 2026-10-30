## [Preview](https://misbka.github.io/Legend-SRT-Generator/)

# 🎬 Legendário — SRT Subtitle Generator

A complete studio for creating **.srt subtitles** with real-time synchronization.

Simply play your video/audio and press **Space** exactly when each subtitle should appear. When you're done, save the file wherever you want.

100% offline, no installation or server required — runs directly in your browser.

---

## ▶ How to Use

**Option A (easiest):** Double-click **`iniciar.bat`**.

**Option B:** Open `index.html` with Chrome, Edge, or Firefox (by dragging it into the browser window or using the *Open File* menu).

> 💡 No installation required. The app runs entirely on your computer, and no files are uploaded to the internet.

---

## 🧭 Workflow (4 Steps)

| Step | What to Do |
|---|---|
| **1. Media** | Drag and drop or select a **video or audio file** (MP4, WebM, MOV, MP3, WAV, M4A, OGG, etc.) |
| **2. Script** | Paste your text or import a **.txt** file — **one line = one subtitle** |
| **3. Synchronize** | Click **▶ Start Synchronization**, play the media, and **press Space** at the right moment for each line |
| **4. Export** | Review and edit your subtitles in the **Editor**, then click **Save .SRT File** |

---

## ⌨️ Keyboard Shortcuts

| Key | During Synchronization | Outside Synchronization |
|---|---|---|
| **Space** | Marks the start of the current subtitle / ends the current one and starts the next | Play / Pause |
| **Enter** | Ends the current subtitle and **pauses** the media (to reposition) | — |
| **Backspace / Delete** | Undoes the last timestamp | — |
| **← / →** | Rewind or fast-forward 5 seconds | Rewind or fast-forward 5 seconds |

### How Spacebar Synchronization Works

```text
Space 1 → Records the START of subtitle 1 (and starts playback if paused)
Space 2 → Ends subtitle 1 and starts subtitle 2 at the same timestamp
Space 3 → Ends subtitle 2 and starts subtitle 3
...
```

The **gap between subtitles** (configured in Step 2) adds a small pause between them (80 ms by default), preventing consecutive subtitles from sticking together.

---

## ✏️ Features

- ▶ Play / pause, ±5-second controls, progress bar, volume, **playback speed** (0.5×–2×), and fullscreen.
- 📄 Import `.txt` files using drag-and-drop or the file picker.
- 🔴 Live synchronization panel: current line, upcoming lines, and progress bar.
- 👁️ Real-time subtitle preview over the video.
- 🛠️ **Full-featured editor:** Edit text, adjust timestamps, reorder subtitles, play from any point, and delete subtitles.
- ✨ **Auto-adjust timestamps:** Fills in missing or invalid end times using the start time of the next subtitle.
- 🎛️ **CapCut-style timeline:** Each subtitle becomes a block proportional to its duration.
  - Click a block to jump to its position.
  - Drag the block body to move it.
  - Drag the edges to adjust start/end times with live preview.
  - Automatic snapping to the playhead and neighboring subtitles.
  - Time ruler and playhead that follows playback.
  - Zoom controls (including `Ctrl` + scroll).
- ↶ Undo synchronization markers.
- 💾 **Save .SRT** to a location selected through the system dialog (or to the Downloads folder) and **copy to the clipboard**.
- 🏷️ Four-step progress indicator at the top.

---

## 📂 Project Structure

The code is **modular**: each responsibility lives in its own file.

```text
subtitle_generator/
├── index.html                 # Interface structure
├── iniciar.bat                # App launcher
├── css/
│   ├── base.css               # Variables, reset, typography, animations
│   ├── layout.css             # Structure: topbar, steps, grid, tabs, responsive layout
│   ├── components.css         # Buttons, player, synchronization, editor, toasts
│   └── timeline.css           # Subtitle timeline (blocks, ruler, playhead)
└── js/
    ├── utils.js               # SRT time formatting, parsing, DOM helpers
    ├── store.js               # Central state + events (pub/sub)
    ├── main.js                # Initializes all modules
    ├── keyboard.js            # Global shortcuts (Space, Enter, Backspace, etc.)
    ├── steps.js               # Four-step progress indicator
    ├── overlay.js             # Subtitles displayed over the video
    ├── ui/
    │   ├── icons.js           # SVG icons
    │   ├── toast.js           # Notifications
    │   └── tabs.js             # Sidebar panel tabs
    ├── media/
    │   └── player.js          # Video/audio loading and playback
    ├── text/
    │   └── scriptInput.js     # Script input: pasted text + .txt files
    ├── sync/
    │   └── synchronizer.js    # Real-time synchronization (core)
    ├── editor/
    │   └── cueEditor.js       # Subtitle review and editing
    ├── timeline/
    │   └── timeline.js        # Visual timeline (drag blocks and edges)
    └── export/
        └── srt.js             # .SRT file generation and saving
```

### Communication Between Modules

No module directly accesses another in a tightly coupled way. Instead, all modules read and write to **`App.Store`** (shared state) and respond to events (`media`, `lines`, `cues`, `sync`, `tick`, `playing`, `exported`, etc.).

This keeps the application loosely coupled, modular, and easy to extend.

---

## 📄 Generated Format

```srt
1
00:00:00,500 --> 00:00:02,920
First subtitle

2
00:00:03,100 --> 00:00:06,480
Second subtitle
```

Compatible with YouTube, Vimeo, media players, Premiere, DaVinci Resolve, VLC, and most subtitle editors.

---

## 🧩 Compatibility

- **Browsers:** Chrome, Edge, Opera, and Firefox (Chrome/Edge recommended).
- **Media:** Codecs supported natively by the browser (MP4/H.264, WebM, MP3, WAV, M4A, OGG).
- **Saving files:** Chrome/Edge open the native *"Save As"* dialog (allowing you to choose the destination folder). Browsers without this feature automatically download the file to the Downloads folder.
