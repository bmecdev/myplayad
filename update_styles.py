import os

games = ['arkanoid', 'invaders', 'snake']

for game in games:
    game_css_path = f'/Users/gonza/mycodes/myPlayAd/games/{game}/game/style.css'
    
    with open(game_css_path, 'r') as f:
        css = f.read()
    
    # 1. Replace root
    import re
    css = re.sub(r':root\s*\{[^}]+\}', """:root {
    --bg-deep: #0a0f0d;
    --panel: #101a15;
    --panel-edge: #1f3327;
    --phosphor: #3dff8a;
    --phosphor-dim: #1f7d49;
    --amber: #ffb703;
    --danger: #ff4d6d;
    --text-dim: #7fae94;
    --white: #eafff2;
}""", css)
    
    # 2. Replace body
    css = re.sub(r'body\s*\{[^}]+\}', """body {
    background: var(--bg-deep);
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    margin: 0;
    font-family: 'VT323', monospace;
    color: var(--white);
    overflow: hidden;
}""", css)
    
    # 3. Replace console-bezel
    css = re.sub(r'\.console-bezel\s*\{[^}]+\}', """.console-bezel {
    background: linear-gradient(180deg, #161f1a, #0d1512);
    padding: 15px 15px 5px 15px;
    border-radius: 18px;
    border: 4px solid #2b4536;
    box-shadow: 0 0 0 2px #060a08, 0 20px 60px rgba(0,0,0,.6), inset 0 0 40px rgba(61,255,138,.04);
    position: relative;
}
.console-bezel::before{
    content:"● ● ●";
    display:block;
    text-align:right;
    color:#2b4536;
    font-family:'Press Start 2P', monospace;
    font-size:8px;
    letter-spacing:6px;
    padding:0 6px 8px;
}""", css)

    # 4. Replace lcd-screen
    css = re.sub(r'\.lcd-screen\s*\{[^}]+\}', """.lcd-screen {
    background: radial-gradient(ellipse at 50% 0%, #0e1a13 0%, #060b08 100%);
    width: 240px;
    height: 240px;
    padding: 10px;
    border: 3px solid #060a08;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}
.lcd-screen::after {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
        to bottom,
        rgba(0,0,0,0) 0px,
        rgba(0,0,0,0) 2px,
        rgba(0,0,0,.18) 3px
    );
    pointer-events: none;
    animation: flicker 6s infinite;
}
@keyframes flicker {
    0%,97%,100% {opacity: 1;}
    98% {opacity: .85;}
}""", css)

    # 5. Replace game-header
    css = re.sub(r'\.game-header\s*\{[^}]+\}', """.game-header {
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: var(--phosphor);
    font-family: 'Press Start 2P', monospace;
    margin-bottom: 2px;
    border-bottom: 1px solid var(--phosphor);
    padding-bottom: 2px;
}""", css)
    
    # 6. Replace Overlays Retro
    css = re.sub(r'#game-over-overlay,\s*#waiting-overlay\s*\{[^}]+\}', """#game-over-overlay,
#waiting-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(6, 11, 8, 0.95);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--phosphor);
}""", css)

    # 7. Replace arcade-title
    css = re.sub(r'\.arcade-title\s*\{[^}]+\}', """.arcade-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    margin: 0 0 10px 0;
    color: var(--phosphor);
    text-shadow: 0 0 6px var(--phosphor);
}""", css)

    css = re.sub(r'\.pulse-text\s*\{[^}]+\}', """.pulse-text {
    margin: 5px 0;
    font-size: 11px;
    font-family: 'Press Start 2P', monospace;
    text-transform: uppercase;
    animation: pulse 1.2s ease-in-out infinite;
    display: inline-block;
    color: var(--phosphor);
}""", css)

    css = re.sub(r'\.qr-wrapper\s*\{[^}]+\}', """.qr-wrapper {
    background: white;
    padding: 5px;
    display: inline-block;
    border: 2px solid var(--phosphor);
    margin: 5px 0;
}""", css)

    # Replace var(--nokia-dark) or var(--nokia-bg) where it still might exist for text
    css = css.replace('var(--nokia-dark)', 'var(--phosphor)')
    css = css.replace('var(--nokia-bg)', 'var(--bg-deep)')
    
    with open(game_css_path, 'w') as f:
        f.write(css)

print("Game CSS updated.")

for game in games:
    control_css_path = f'/Users/gonza/mycodes/myPlayAd/games/{game}/control/style.css'
    if not os.path.exists(control_css_path):
        continue
    with open(control_css_path, 'r') as f:
        css = f.read()
    
    css = re.sub(r':root\s*\{[^}]+\}', """:root {
    --bg-deep: #0a0f0d;
    --primary: #3dff8a;
    --primary-dark: #1f7d49;
    --text: #eafff2;
    --accent: #ffb703;
}""", css)
    
    css = re.sub(r'body\s*\{[^}]+\}', """body {
    background-color: var(--bg-deep);
    color: var(--text);
    font-family: 'VT323', monospace;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    overflow: hidden;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}""", css)

    css = re.sub(r'\.header-logo h1\s*\{[^}]+\}', """.header-logo h1 {
    font-family: 'Press Start 2P', monospace;
    font-size: 20px;
    margin: 0;
    color: var(--primary);
    text-shadow: 0 0 8px var(--primary);
    letter-spacing: -1px;
}""", css)

    css = re.sub(r'\#nickname-input\s*\{[^}]+\}', """#nickname-input {
    background: #0e1a13;
    border: 2px solid #2b4536;
    border-radius: 12px;
    padding: 15px;
    color: var(--text);
    font-family: 'VT323', monospace;
    font-size: 22px;
    text-align: center;
    outline: none;
    transition: border-color 0.3s;
}""", css)

    css = re.sub(r'\.trackpad-indicator\s*\{[^}]+\}', """.trackpad-indicator {
    width: 40px;
    height: 80px;
    background: var(--primary-dark);
    border-radius: 12px;
    position: absolute;
    left: 50%;
    top: 60%;
    transform: translate(-50%, -50%);
    box-shadow: 0 6px 16px rgba(61, 255, 138, 0.3);
    border: 2px solid var(--primary);
    transition: box-shadow 0.1s;
    cursor: pointer;
    pointer-events: none;
}""", css)
    
    css = css.replace('var(--nokia-dark)', 'var(--primary)')
    css = css.replace('var(--nokia-bg)', 'var(--bg-deep)')

    with open(control_css_path, 'w') as f:
        f.write(css)

print("Control CSS updated.")
