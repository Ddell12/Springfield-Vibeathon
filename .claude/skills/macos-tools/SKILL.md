---
name: macos-tools
description: Controls macOS via osascript, Homebrew, Shortcuts, and shell — music, volume, notifications, apps, DND, power. Use for "play music", "set volume", "notify me", "open app", "install", "run shortcut".
allowed-tools: Bash(osascript *), Bash(open *), Bash(brew *), Bash(shortcuts *), Bash(pmset *), Bash(networksetup *), Bash(defaults *), Bash(say *)
---

# macOS Local Tools

You are running on Deshawn's Mac mini (Apple Silicon, macOS 26). You have direct access to system control via the commands below.

## Music Control (Spotify)

```bash
# Play/pause
osascript -e 'tell application "Spotify" to playpause'

# Next/previous track
osascript -e 'tell application "Spotify" to next track'
osascript -e 'tell application "Spotify" to previous track'

# Current track info
osascript -e 'tell application "Spotify" to name of current track & " by " & artist of current track'

# Play a specific URI (album, playlist, track)
osascript -e 'tell application "Spotify" to play track "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"'

# Set Spotify volume (0-100, independent of system volume)
osascript -e 'tell application "Spotify" to set sound volume to 50'

# Check if Spotify is running
osascript -e 'application "Spotify" is running'
```

## System Volume

```bash
# Get current volume (0-100)
osascript -e 'output volume of (get volume settings)'

# Set volume (0-100)
osascript -e 'set volume output volume 50'

# Mute/unmute
osascript -e 'set volume output muted true'
osascript -e 'set volume output muted false'

# Check mute state
osascript -e 'output muted of (get volume settings)'
```

## Notifications

```bash
# Display notification
osascript -e 'display notification "Message here" with title "Aura" subtitle "Optional subtitle"'

# With sound
osascript -e 'display notification "Done!" with title "Aura" sound name "Glass"'
```

## App Management

```bash
# Launch an app
open -a "Safari"

# Quit an app gracefully
osascript -e 'tell application "Safari" to quit'

# List running apps
osascript -e 'tell application "System Events" to get name of every process whose background only is false'

# Activate (bring to front)
osascript -e 'tell application "Safari" to activate'
```

## Homebrew

```bash
# Install a package
brew install <package>

# Search for packages
brew search <query>

# List installed packages
brew list

# Update all packages
brew update && brew upgrade

# Get info about a package
brew info <package>

# Install a cask (GUI app)
brew install --cask <app>
```

## Shortcuts

```bash
# List available shortcuts
shortcuts list

# Run a shortcut
shortcuts run "<shortcut-name>"

# Run with input
echo "input text" | shortcuts run "<shortcut-name>"
```

## System Settings

```bash
# Do Not Disturb (Focus mode)
shortcuts run "Toggle Do Not Disturb"

# Screen brightness (requires brightness CLI: brew install brightness)
brightness 0.7

# Caffeine (prevent sleep)
caffeinate -d -t 3600  # prevent display sleep for 1 hour

# Text-to-speech
say "Hello from Aura"
say -v Samantha "Hello from Aura"  # specific voice
```

## Power Management

```bash
# Check battery / power status
pmset -g batt

# Schedule sleep
pmset sleepnow

# Check scheduled events
pmset -g sched
```

## Network

```bash
# Get current Wi-Fi network
networksetup -getairportnetwork en0

# Get IP address
ipconfig getifaddr en0

# Toggle Wi-Fi
networksetup -setairportpower en0 off
networksetup -setairportpower en0 on
```

## Safety Rules

**Always confirm before:**

- `pmset sleepnow` or shutdown commands
- Killing processes or force-quitting apps
- Changing network settings
- Installing software (`brew install`)
- Modifying system defaults (`defaults write`)

**Never run without explicit user request:**

- `rm -rf` or destructive file operations
- `sudo` commands
- `defaults delete` (can break apps)
- `networksetup` changes to wired interfaces
