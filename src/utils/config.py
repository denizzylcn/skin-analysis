"""Konfigürasyon yükleyici."""
import yaml
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]

def load_config(path: str | Path = None) -> dict:
    cfg_path = path or _ROOT / "config.yaml"
    with open(cfg_path) as f:
        return yaml.safe_load(f)

CONFIG = load_config()
