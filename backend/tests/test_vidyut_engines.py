"""P11-0: pin the idle Vidyut engines so a missing dataset fails loudly here,
not silently in four features.

vidyut-data/ is gitignored and auto-downloaded; a fresh clone must still go
green, so we SKIP (not fail) when the directory is absent. No network.
"""

import os

import pytest

from app.services.prakriya import _data_dir as _prakriya_data_dir
from app.services import chandas, sandhi
from app.services.varna_distance import distance_on_grid


def _vidyut_present() -> bool:
    return os.path.isdir(os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "vidyut-data",
    ))


pytestmark = pytest.mark.skipif(
    not _vidyut_present(), reason="vidyut-data absent; auto-downloads on first run"
)


def test_all_engines_import_and_load():
    """The four idle engines load their data without error."""
    # prakriya sutra corpus loads
    from vidyut.prakriya import Data
    data = Data(_prakriya_data_dir())
    sutras = data.load_sutras()
    assert len(sutras) >= 5000
    codes = {s.code for s in sutras}
    assert len(codes) >= 5000

    # chandas loads its 145 vṛttas from the TSV
    from vidyut.chandas import Chandas
    import app.services.chandas as champkg
    champkg._load()
    assert champkg._chandas is not False

    # sandhi + kosha load
    sandhi._load()
    assert sandhi._splitter is not False and sandhi._kosha is not False

    # varna grid builds from the API's own place values
    r = distance_on_grid("क", "ग")
    assert r["distance"] == 1