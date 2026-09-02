"""P11-4: phonetic distance on the varṇamālā grid. No network, no DB."""

from app.services.varna_distance import distance_on_grid


def test_identical_is_zero():
    assert distance_on_grid("क", "क")["distance"] == 0


def test_voicing_axis():
    # क → ग same place, one voicing step
    r = distance_on_grid("क", "ग")
    assert r["distance"] == 1
    assert r["axis"] == "voicing"


def test_aspiration_axis():
    # क → ख same place, one aspiration step
    r = distance_on_grid("क", "ख")
    assert r["axis"] == "aspiration"
    assert r["distance"] == 1


def test_place_axis_is_far():
    # क → प throat to lips
    r = distance_on_grid("क", "प")
    assert r["axis"] == "place"
    assert r["distance"] >= 2


def test_nasality_axis():
    # क → ङ nasal of the same row
    r = distance_on_grid("क", "ङ")
    assert r["axis"] == "nasality"


def test_outside_grid_returns_defined_result():
    # a vowel has no place-grid cell; must not raise
    r = distance_on_grid("अ", "क")
    assert r["distance"] == -1
    assert r["axis"] is None
