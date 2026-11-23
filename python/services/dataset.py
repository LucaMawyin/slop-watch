
from pathlib import Path
from threading import Condition

from config.sports import SPORT_CONFIG


_reader_condition = Condition()

_active_readers = {
    "primary": 0,
    "candidate": 0,
}

_writing_slots = set()


def validate_slot(slot: str):
    if slot not in ("primary", "candidate"):
        raise ValueError(f"Invalid dataset slot: {slot}")


def get_dataset_paths(league: str, slot: str):
    validate_slot(slot)

    config = SPORT_CONFIG[league]

    raw_path = Path(config["output"])
    processed_path = Path(config["processed_output"])

    if slot == "candidate":
        raw_path = raw_path.with_name(
            f"{raw_path.stem}_candidate{raw_path.suffix}"
        )

        processed_path = processed_path.with_name(
            f"{processed_path.stem}_candidate{processed_path.suffix}"
        )

    return raw_path, processed_path


def acquire_dataset_reader(slot: str):
    validate_slot(slot)

    with _reader_condition:
        available = _reader_condition.wait_for(
            lambda: slot not in _writing_slots,
            timeout=300,
        )

        if not available:
            raise TimeoutError(
                f"Timed out waiting to read dataset slot {slot}"
            )

        _active_readers[slot] += 1


def release_dataset_reader(slot: str):
    validate_slot(slot)

    with _reader_condition:
        if _active_readers[slot] <= 0:
            raise RuntimeError(
                f"No active reader to release for slot {slot}"
            )

        _active_readers[slot] -= 1
        _reader_condition.notify_all()


def begin_dataset_write(slot: str, timeout: int = 300):
    validate_slot(slot)

    with _reader_condition:
        available = _reader_condition.wait_for(
            lambda: (
                _active_readers[slot] == 0
                and slot not in _writing_slots
            ),
            timeout=timeout,
        )

        if not available:
            raise TimeoutError(
                f"Timed out waiting to write dataset slot {slot}"
            )

        _writing_slots.add(slot)


def end_dataset_write(slot: str):
    validate_slot(slot)

    with _reader_condition:
        if slot not in _writing_slots:
            raise RuntimeError(
                f"Dataset slot {slot} is not being written"
            )

        _writing_slots.remove(slot)
        _reader_condition.notify_all()
