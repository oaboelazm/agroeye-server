# AgroEye API CLI

This adds a small CLI that can start, stop, and manage the AgroEye API from any terminal.

Before using it, make sure your Python environment has the dependencies installed from `requirements.txt`.

## Quick setup
1) From the API Engine folder, test it once:

```bash
cd api
./agroeye-api serve
```

2) Make it available everywhere (recommended):

```bash
mkdir -p "$HOME/.local/bin"
ln -sf "$(pwd)/agroeye-api" "$HOME/.local/bin/agroeye-api"
```

3) Ensure your PATH includes `~/.local/bin` (one time):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

If you want it permanent, add the export line to `~/.bashrc` or `~/.zshrc`.

## Commands
- Start in background (default):

```bash
agroeye-api serve
```

- Stop:

```bash
agroeye-api stop
```

- Restart:

```bash
agroeye-api restart
```

- Status:

```bash
agroeye-api status
```

If autostart is enabled, `status` will report the systemd service state.

- Logs (last 200 lines):

```bash
agroeye-api logs
```

Logs include timestamps. When autostart/systemd is enabled, `logs` reads from the systemd journal.

- Autostart toggle (boot on/off):

```bash
agroeye-api autostart true
agroeye-api autostart false
agroeye-api autostart status
```

`autostart true/false` only toggles startup on next boot. It does not start or stop the service immediately.

Optional shortcut (if you want `restart` alone):

```bash
alias restart="agroeye-api restart"
```

## Useful flags
- Run in foreground (keeps logs in the terminal):

```bash
agroeye-api serve --foreground
```

- Override host/port:

```bash
agroeye-api serve --host 0.0.0.0 --port 8000
```

- Disable the banner:

```bash
agroeye-api serve --no-banner
```

- Use a different app/module (example):

```bash
agroeye-api serve --app fullapi:app --api-dir "$(pwd)"
```

Note: the banner is printed only on `serve`/`restart`. If you run `status` it will not show the header.
If you still do not see it, make sure you are not using `--no-banner` and that `NO_COLOR` is not set.

## Auto-start on boot (systemd user service)
You can enable/disable autostart from the CLI (recommended):

```bash
agroeye-api autostart true
agroeye-api autostart false
agroeye-api autostart status
```

You can also customize the autostart command:

```bash
agroeye-api autostart true --host 0.0.0.0 --port 8000 --log-level info
```

If you prefer to manage it manually, create the user service file below.

1) Create the service file:

```bash
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/agroeye-api.service" <<'EOF'
[Unit]
Description=AgroEye API
After=network.target

[Service]
Type=simple
Environment=PATH=%h/.local/bin:/usr/bin:/bin
ExecStart=%h/.local/bin/agroeye-api serve --foreground --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF
```

If your API Engine folder is in a different location, you can set `AGROEYE_ROOT` in the service file.

2) Reload and enable it:

```bash
systemctl --user daemon-reload
systemctl --user enable --now agroeye-api.service
```

3) Check status and logs:

```bash
systemctl --user status agroeye-api.service
journalctl --user -u agroeye-api.service -f
```

Optional: to start even before you log in, enable linger once:

```bash
loginctl enable-linger "$USER"
```

## Environment overrides
- `AGROEYE_ROOT`: API Engine folder path (used by the wrapper script)
- `AGROEYE_API_DIR`: path to the folder that contains the API module
- `AGROEYE_PYTHON`: full path to the Python executable to run

## Notes
- Default API module: `api_server:app` inside this folder.
- PID/log files are stored in `.run/` inside the API Engine folder.
