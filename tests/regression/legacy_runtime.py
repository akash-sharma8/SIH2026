from pathlib import Path
import importlib.util


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RUNTIME_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "runtime.py"
)


def load_legacy_runtime():
    if not RUNTIME_PATH.is_file():
        raise FileNotFoundError(
            f"Legacy runtime not found: {RUNTIME_PATH}"
        )

    spec = importlib.util.spec_from_file_location(
        "raileta_legacy_runtime",
        RUNTIME_PATH,
    )

    if spec is None or spec.loader is None:
        raise ImportError(
            f"Could not load legacy runtime: {RUNTIME_PATH}"
        )

    module = importlib.util.module_from_spec(spec)

    spec.loader.exec_module(module)

    return module


ml_runtime = load_legacy_runtime()