# osascript Patterns Reference

## Dialog Boxes

```bash
# Simple alert
osascript -e 'display alert "Title" message "Body text"'

# Alert with buttons
osascript -e 'display alert "Confirm?" buttons {"Cancel", "OK"} default button "OK"'

# Text input dialog
osascript -e 'display dialog "Enter name:" default answer ""'

# Choose from list
osascript -e 'choose from list {"Option A", "Option B", "Option C"} with title "Pick one"'
```

## File Operations

```bash
# Choose a file
osascript -e 'choose file with prompt "Select a file"'

# Choose a folder
osascript -e 'choose folder with prompt "Select a folder"'

# Get Finder selection
osascript -e 'tell application "Finder" to get selection as alias list'
```

## Clipboard

```bash
# Get clipboard contents
osascript -e 'the clipboard'

# Set clipboard
osascript -e 'set the clipboard to "copied text"'

# Get clipboard as specific type
pbpaste    # plain text
pbcopy     # pipe text to clipboard: echo "text" | pbcopy
```

## Window Management

```bash
# Get frontmost app
osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'

# Get window bounds
osascript -e 'tell application "System Events" to tell process "Safari" to get position of window 1'
osascript -e 'tell application "System Events" to tell process "Safari" to get size of window 1'

# Move/resize window
osascript -e 'tell application "System Events" to tell process "Safari" to set position of window 1 to {0, 0}'
osascript -e 'tell application "System Events" to tell process "Safari" to set size of window 1 to {1280, 720}'

# Minimize/fullscreen
osascript -e 'tell application "System Events" to tell process "Safari" to set value of attribute "AXMinimized" of window 1 to true'
```

## System Information

```bash
# macOS version
sw_vers

# CPU info
sysctl -n machdep.cpu.brand_string

# Memory info
sysctl -n hw.memsize | awk '{print $0/1073741824 " GB"}'

# Disk space
df -h /

# Uptime
uptime
```

## Calendar (via osascript)

```bash
# Get today's events
osascript -e 'tell application "Calendar"
  set today to current date
  set tomorrow to today + 1 * days
  set allEvents to {}
  repeat with cal in calendars
    set evts to (every event of cal whose start date >= today and start date < tomorrow)
    set allEvents to allEvents & evts
  end repeat
  set output to ""
  repeat with evt in allEvents
    set output to output & summary of evt & " at " & time string of start date of evt & "\n"
  end repeat
  output
end tell'
```

## Apple Music (alternative to Spotify)

```bash
# Play/pause
osascript -e 'tell application "Music" to playpause'

# Current track
osascript -e 'tell application "Music" to name of current track & " by " & artist of current track'

# Next/previous
osascript -e 'tell application "Music" to next track'
osascript -e 'tell application "Music" to previous track'

# Search and play
osascript -e 'tell application "Music" to play (first track whose name contains "song name")'
```
