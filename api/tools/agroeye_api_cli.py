#!/usr/bin/env python3
"""AgroEye API control CLI."""

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
from collections import deque
from typing import Optional

APP_DEFAULT = "api_server:app"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000
DEFAULT_LOG_LEVEL = "info"
DEFAULT_LOG_CONFIG_NAME = "uvicorn_logging.json"
RUN_DIR_NAME = ".run"
PID_FILE_NAME = "agroeye-api.pid"
LOG_FILE_NAME = "agroeye-api.log"
SERVICE_NAME = "agroeye-api.service"

BANNER = r"""
 █████╗      ██████╗     ██████╗      ██████╗     ███████╗    ██╗   ██╗    ███████╗
██╔══██╗    ██╔════╝     ██╔══██╗    ██╔═══██╗    ██╔════╝    ╚██╗ ██╔╝    ██╔════╝
███████║    ██║  ███╗    ██████╔╝    ██║   ██║    █████╗       ╚████╔╝     █████╗  
██╔══██║    ██║   ██║    ██╔══██╗    ██║   ██║    ██╔══╝        ╚██╔╝      ██╔══╝  
██║  ██║    ╚██████╔╝    ██║  ██║    ╚██████╔╝    ███████╗       ██║       ███████╗  V2.0
╚═╝  ╚═╝     ╚═════╝     ╚═╝  ╚═╝     ╚═════╝     ╚══════╝       ╚═╝       ╚══════╝
                                                                                                       
"""


def _project_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _wrapper_path(project_root: str) -> str:
    return os.path.join(project_root, "agroeye-api")


def _resolve_api_dir(project_root: str, override: Optional[str]) -> str:
    if override:
        return override
    env_dir = os.environ.get("AGROEYE_API_DIR")
    if env_dir:
        return env_dir
    return project_root


def _resolve_python(project_root: str) -> str:
    env_python = os.environ.get("AGROEYE_PYTHON")
    if env_python:
        return env_python
    candidates = [
        os.path.join(project_root, "venv", "bin", "python"),
        os.path.join(os.path.dirname(project_root), "venv", "bin", "python"),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return sys.executable


def _run_dir(project_root: str) -> str:
    path = os.path.join(project_root, RUN_DIR_NAME)
    os.makedirs(path, exist_ok=True)
    return path


def _pid_path(project_root: str) -> str:
    return os.path.join(_run_dir(project_root), PID_FILE_NAME)


def _log_path(project_root: str) -> str:
    return os.path.join(_run_dir(project_root), LOG_FILE_NAME)


def _systemd_user_dir() -> str:
    return os.path.join(os.path.expanduser("~"), ".config", "systemd", "user")


def _systemd_service_path() -> str:
    return os.path.join(_systemd_user_dir(), SERVICE_NAME)


def _systemctl_path() -> Optional[str]:
    return shutil.which("systemctl")


def _journalctl_path() -> Optional[str]:
    return shutil.which("journalctl")


def _systemd_unit_file_exists() -> bool:
    return os.path.exists(_systemd_service_path())


def _systemd_state(systemctl: Optional[str]) -> Optional[str]:
    if not systemctl or not _systemd_unit_file_exists():
        return None
    result = subprocess.run(
        [systemctl, "--user", "is-active", SERVICE_NAME],
        capture_output=True,
        text=True,
        check=False,
    )
    state = (result.stdout or result.stderr).strip()
    return state or "unknown"


def _default_log_config_path(project_root: str) -> str:
    return os.path.join(project_root, "tools", DEFAULT_LOG_CONFIG_NAME)


def _resolve_log_config_path(project_root: str, override: Optional[str]) -> Optional[str]:
    if override:
        return override
    default_path = _default_log_config_path(project_root)
    if os.path.exists(default_path):
        return default_path
    return None


def _read_pid(pid_path: str) -> Optional[int]:
    if not os.path.exists(pid_path):
        return None
    try:
        with open(pid_path, "r", encoding="utf-8") as f:
            raw = f.read().strip()
        if raw.isdigit():
            return int(raw)
    except OSError:
        return None
    return None


def _write_pid(pid_path: str, pid: int) -> None:
    with open(pid_path, "w", encoding="utf-8") as f:
        f.write(str(pid))


def _clear_pid(pid_path: str) -> None:
    try:
        os.remove(pid_path)
    except FileNotFoundError:
        pass


def _is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _print_banner(no_banner: bool) -> None:
    if no_banner:
        return
    if os.environ.get("NO_COLOR"):
        print(BANNER)
        print("[+] AgroEye API control ready")
        return
    green = "\033[32m"
    bright = "\033[1m"
    reset = "\033[0m"
    print(f"{green}{bright}{BANNER}{reset}")
    print(f"{green}[+] AgroEye API control ready{reset}")


def _systemd_quote(value: str) -> str:
    if value == "":
        return '""'
    needs_quotes = any(ch.isspace() for ch in value) or any(ch in value for ch in ['"', "\\"])
    if not needs_quotes:
        return value
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'




def _build_uvicorn_cmd(
    args: argparse.Namespace,
    python_exe: str,
    log_config_path: Optional[str],
) -> list[str]:
    cmd = [
        python_exe,
        "-m",
        "uvicorn",
        args.app,
        "--host",
        args.host,
        "--port",
        str(args.port),
        "--log-level",
        args.log_level,
    ]
    if log_config_path:
        cmd.extend(["--log-config", log_config_path])
    if args.reload:
        cmd.append("--reload")
    if args.workers and args.workers > 1:
        cmd.extend(["--workers", str(args.workers)])
    return cmd


def _build_service_exec(args: argparse.Namespace, project_root: str) -> str:
    wrapper = _wrapper_path(project_root)
    log_config_path = _resolve_log_config_path(project_root, args.log_config)
    cmd = [
        wrapper,
        "serve",
        "--foreground",
        "--host",
        args.host,
        "--port",
        str(args.port),
        "--log-level",
        args.log_level,
    ]
    if log_config_path:
        cmd.extend(["--log-config", log_config_path])
    if args.app != APP_DEFAULT:
        cmd.extend(["--app", args.app])
    if args.api_dir:
        cmd.extend(["--api-dir", args.api_dir])
    if args.reload:
        cmd.append("--reload")
    if args.workers and args.workers > 1:
        cmd.extend(["--workers", str(args.workers)])
    if args.no_banner:
        cmd.append("--no-banner")
    return " ".join(_systemd_quote(part) for part in cmd)


def _build_service_file(args: argparse.Namespace, project_root: str) -> str:
    exec_cmd = _build_service_exec(args, project_root)
    return "\n".join(
        [
            "[Unit]",
            "Description=AgroEye API",
            "After=network.target",
            "",
            "[Service]",
            "Type=simple",
            f"Environment=PATH=%h/.local/bin:/usr/bin:/bin",
            f"ExecStart={exec_cmd}",
            "Restart=on-failure",
            "RestartSec=3",
            "",
            "[Install]",
            "WantedBy=default.target",
            "",
        ]
    )


def serve(args: argparse.Namespace) -> int:
    project_root = _project_root()
    api_dir = _resolve_api_dir(project_root, args.api_dir)
    if not os.path.isdir(api_dir):
        print(f"API directory not found: {api_dir}")
        return 1

    _print_banner(args.no_banner)

    pid_path = _pid_path(project_root)
    existing_pid = _read_pid(pid_path)
    if existing_pid and _is_running(existing_pid):
        print(f"Already running (PID {existing_pid}).")
        return 0
    if existing_pid:
        _clear_pid(pid_path)

    python_exe = _resolve_python(project_root)
    log_config_path = _resolve_log_config_path(project_root, args.log_config)
    cmd = _build_uvicorn_cmd(args, python_exe, log_config_path)
    env = os.environ.copy()

    if args.foreground:
        print("[+] Starting in foreground...")
        return subprocess.call(cmd, cwd=api_dir, env=env)

    log_path = _log_path(project_root)
    with open(log_path, "a", encoding="utf-8") as log_file:
        proc = subprocess.Popen(
            cmd,
            cwd=api_dir,
            env=env,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    _write_pid(pid_path, proc.pid)
    print(f"[+] Started (PID {proc.pid}).")
    print(f"[+] Logs: {log_path}")
    return 0


def stop(_: argparse.Namespace) -> int:
    project_root = _project_root()
    systemctl = _systemctl_path()
    systemd_state = _systemd_state(systemctl)
    stopped_any = False
    if systemctl and systemd_state in {"active", "activating", "deactivating"}:
        subprocess.run([systemctl, "--user", "stop", SERVICE_NAME], check=False)
        stopped_any = True

    pid_path = _pid_path(project_root)
    pid = _read_pid(pid_path)
    if not pid:
        if stopped_any:
            print("Stopped.")
            return 0
        print("Not running.")
        return 0
    if not _is_running(pid):
        _clear_pid(pid_path)
        if stopped_any:
            print("Stopped.")
            return 0
        print("Stale PID file removed.")
        return 0

    print(f"[+] Stopping PID {pid}...")
    os.kill(pid, signal.SIGTERM)
    for _ in range(50):
        if not _is_running(pid):
            _clear_pid(pid_path)
            print("[+] Stopped.")
            return 0
        time.sleep(0.1)

    print("[!] Still running, sending SIGKILL...")
    os.kill(pid, signal.SIGKILL)
    _clear_pid(pid_path)
    print("[+] Stopped.")
    return 0


def restart(args: argparse.Namespace) -> int:
    stop(args)
    return serve(args)


def status(_: argparse.Namespace) -> int:
    project_root = _project_root()
    systemctl = _systemctl_path()
    systemd_state = _systemd_state(systemctl)
    if systemd_state in {"active", "activating"}:
        print(f"Status: running (systemd: {systemd_state})")
        return 0
    pid_path = _pid_path(project_root)
    pid = _read_pid(pid_path)
    if not pid:
        print("Status: stopped")
        return 1
    if _is_running(pid):
        print(f"Status: running (PID {pid})")
        print(f"Logs: {_log_path(project_root)}")
        return 0
    _clear_pid(pid_path)
    if systemd_state:
        print(f"Status: stopped (systemd: {systemd_state})")
        return 1
    print("Status: stopped (stale PID removed)")
    return 1


def logs(args: argparse.Namespace) -> int:
    project_root = _project_root()
    log_path = _log_path(project_root)
    lines = max(1, args.lines)
    journalctl = _journalctl_path()
    systemctl = _systemctl_path()
    systemd_state = _systemd_state(systemctl)
    if journalctl and _systemd_unit_file_exists():
        if systemd_state in {"active", "activating"} or not os.path.exists(log_path):
            return subprocess.call(
                [
                    journalctl,
                    "--user",
                    "-u",
                    SERVICE_NAME,
                    "-n",
                    str(lines),
                    "--no-pager",
                    "-o",
                    "short-iso",
                ]
            )

    if not os.path.exists(log_path):
        print("No logs yet.")
        return 1
    with open(log_path, "r", encoding="utf-8", errors="replace") as f:
        tail = deque(f, maxlen=lines)

    for line in tail:
        print(line, end="")
    return 0


def autostart(args: argparse.Namespace) -> int:
    systemctl = _systemctl_path()
    if not systemctl:
        print("systemctl not found. Autostart requires systemd.")
        return 1

    project_root = _project_root()
    state = str(args.state).strip().lower()
    if state in {"status"}:
        return subprocess.call([systemctl, "--user", "--no-pager", "status", SERVICE_NAME])

    if state in {"true", "on", "enable", "enabled"}:
        os.makedirs(_systemd_user_dir(), exist_ok=True)
        service_path = _systemd_service_path()
        with open(service_path, "w", encoding="utf-8") as f:
            f.write(_build_service_file(args, project_root))
        subprocess.run([systemctl, "--user", "daemon-reload"], check=False)
        subprocess.run([systemctl, "--user", "reset-failed"], check=False)
        subprocess.run([systemctl, "--user", "enable", SERVICE_NAME], check=False)
        print("Autostart enabled (will apply on next boot).")
        print(f"Service file: {service_path}")
        return 0

    if state in {"false", "off", "disable", "disabled"}:
        subprocess.run([systemctl, "--user", "disable", SERVICE_NAME], check=False)
        print("Autostart disabled (running service not stopped).")
        return 0

    print("Invalid state. Use true/false or status.")
    return 1


def _add_serve_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--app", default=APP_DEFAULT, help="ASGI app path (default: api_server:app)")
    parser.add_argument("--api-dir", default=None, help="Folder that contains the API module")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--log-level", default=DEFAULT_LOG_LEVEL)
    parser.add_argument("--log-config", default=None, help="Path to a uvicorn logging config file")
    parser.add_argument("--reload", action="store_true")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--foreground", action="store_true", help="Run in foreground")
    parser.add_argument("--no-banner", action="store_true", help="Disable the AgroEye banner")


def main() -> int:
    parser = argparse.ArgumentParser(prog="agroeye-api", description="AgroEye API control CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    serve_parser = subparsers.add_parser("serve", help="Start the API server")
    _add_serve_args(serve_parser)
    serve_parser.set_defaults(func=serve)

    stop_parser = subparsers.add_parser("stop", help="Stop the API server")
    stop_parser.set_defaults(func=stop)

    restart_parser = subparsers.add_parser("restart", help="Restart the API server")
    _add_serve_args(restart_parser)
    restart_parser.set_defaults(func=restart)

    status_parser = subparsers.add_parser("status", help="Show server status")
    status_parser.set_defaults(func=status)

    logs_parser = subparsers.add_parser("logs", help="Show recent logs")
    logs_parser.add_argument("--lines", type=int, default=200)
    logs_parser.set_defaults(func=logs)

    autostart_parser = subparsers.add_parser("autostart", help="Enable/disable autostart on boot")
    autostart_parser.add_argument("state", help="true | false | status")
    _add_serve_args(autostart_parser)
    autostart_parser.set_defaults(func=autostart)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
