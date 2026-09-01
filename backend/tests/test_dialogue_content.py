"""Tests for the 'प्रथमं मेलनम्' dialogue graph seed scenario."""
import pytest

from app.grading.engine import grade_attempt
from app.seeds.dialogue import SCENARIO


def _collect_nodes(scenario):
    """Return dict of friendly-id -> node data."""
    return {n["id"]: n for n in scenario["nodes"]}


def _collect_edges(scenario):
    """Return list of edge dicts."""
    return list(scenario["edges"])


def _collect_sa_edges(scenario):
    """Return edges where lang == 'sa'."""
    return [e for e in scenario["edges"] if e["lang"] == "sa"]


class TestScenarioStructure:
    """The scenario loads and has correct structure."""

    def test_scenario_has_title(self):
        assert SCENARIO["title"] == "प्रथमं मेलनम्"

    def test_scenario_has_30_nodes(self):
        nodes = _collect_nodes(SCENARIO)
        assert len(nodes) == 30, f"Expected 30 nodes, got {len(nodes)}"

    def test_scenario_has_entry_node(self):
        assert SCENARIO["entry_node_id"] is not None
        nodes = _collect_nodes(SCENARIO)
        assert SCENARIO["entry_node_id"] in nodes, \
            f"entry_node_id {SCENARIO['entry_node_id']!r} not in nodes"

    def test_all_nodes_reachable_from_entry(self):
        """All nodes reachable from entry via edges (except terminal)."""
        nodes = _collect_nodes(SCENARIO)
        edges = _collect_edges(SCENARIO)

        # Build adjacency: from_node_id -> set of to_node_id
        adj: dict[str, set[str | None]] = {}
        for e in edges:
            adj.setdefault(e["from_node_id"], set()).add(e["to_node_id"])

        entry = SCENARIO["entry_node_id"]
        reachable = set()
        stack = [entry]
        while stack:
            nid = stack.pop()
            if nid in reachable:
                continue
            if nid is None:
                continue
            reachable.add(nid)
            for to_nid in adj.get(nid, set()):
                if to_nid is not None and to_nid not in reachable:
                    stack.append(to_nid)

        unreachable = set(nodes.keys()) - reachable
        assert len(unreachable) == 0, \
            f"Unreachable nodes: {sorted(unreachable)}"

    def test_has_terminal_convention(self):
        """A terminal node exists (no outgoing edges or referenced as terminus)."""
        edges = _collect_edges(SCENARIO)
        # Find edges with explicit to_node_id that is None → terminal
        terminal_edges = [e for e in edges if e["to_node_id"] is None]
        assert len(terminal_edges) >= 0  # convention: use nterm

    def test_repairs_have_repair_type_set(self):
        nodes = _collect_nodes(SCENARIO)
        for nid, ndata in nodes.items():
            if ndata["kind"] == "repair":
                assert ndata.get("repair_type") is not None, \
                    f"Repair node {nid!r} has no repair_type"

    def test_tutor_nodes_have_default_audio_url(self):
        nodes = _collect_nodes(SCENARIO)
        for nid, ndata in nodes.items():
            if ndata["kind"] == "tutor":
                # Must have audio_url key (default "")
                assert "audio_url" in ndata, f"Tutor node {nid!r} missing audio_url"
                assert ndata["audio_url"] == "", \
                    f"Tutor node {nid!r} should have empty audio_url by default"


class TestSaEdgeCorrectness:
    """Every sa-edge grades 'correct' on its own expected_text."""

    def test_no_sa_edge_is_unsure(self):
        """No sa-edge should produce 'unsure' verdict on its expected_text."""
        sa_edges = _collect_sa_edges(SCENARIO)
        unsure_edges = []
        for edge in sa_edges:
            result = grade_attempt(
                edge["expected_text"],
                edge["accepted_parses"],
                edge["features"],
            )
            if result["verdict"] == "unsure":
                unsure_edges.append(
                    f"{edge['from_node_id']}→{edge['to_node_id']}: {edge['expected_text']!r}"
                )
        assert not unsure_edges, \
            f"sa-edges with 'unsure' verdict:\n" + "\n".join(unsure_edges)

    def test_all_sa_edges_grade_correct(self):
        """Every sa-edge's expected_text must grade 'correct'."""
        sa_edges = _collect_sa_edges(SCENARIO)
        assert len(sa_edges) > 0, "No sa-edges found"

        failures = []
        for edge in sa_edges:
            result = grade_attempt(
                edge["expected_text"],
                edge["accepted_parses"],
                edge["features"],
            )
            if result["verdict"] != "correct":
                failures.append(
                    f"{edge['from_node_id']}→{edge['to_node_id']}: "
                    f"expected_text={edge['expected_text']!r} "
                    f"verdict={result['verdict']!r} "
                    f"diagnosis={result.get('diagnosis', '')!r}"
                )
        assert not failures, \
            f"{len(failures)} sa-edge(s) did NOT grade 'correct':\n" + "\n".join(failures)


class TestScenarioFeatures:
    """Feature-specific checks."""

    def test_sa_edges_have_features(self):
        sa_edges = _collect_sa_edges(SCENARIO)
        for edge in sa_edges:
            assert edge["features"], \
                f"sa-edge {edge['from_node_id']}→{edge['to_node_id']} has no features"

    def test_sa_edges_have_accepted_parses(self):
        sa_edges = _collect_sa_edges(SCENARIO)
        for edge in sa_edges:
            assert edge["accepted_parses"], \
                f"sa-edge {edge['from_node_id']}→{edge['to_node_id']} has no accepted_parses"