"""One-shot: test Chedaka extraction against every seed sentence. Diagnostic only."""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vidyut.cheda import Chedaka
from vidyut.lipi import transliterate, Scheme
from app.seeds.challenges import SEED_CHALLENGES

c = Chedaka("vidyut-data")
VIB = {"praTamA": "NOM", "dvitIyA": "ACC", "tftIyA": "INSTR", "caturTI": "DAT",
       "paYcamI": "ABL", "zazWI": "GEN", "saptamI": "LOC", "samboDanam": "VOC"}
VAC = {"eka": "SG", "dvi": "DU", "bahu": "PL"}
LAK = {"la~w": "PRES", "lo~w": "IMP", "lft": "FUT", "la\\N": "IMPF", "vidhi~li~N": "OPT", "ASIrli~N": "OPT"}
PUR = {"praTama": "3", "maDyama": "2", "uttama": "1"}

ok = fail = 0
fails = []
for ch in SEED_CHALLENGES:
    dev = ch["target_sanskrit"]
    slp1 = transliterate(dev, Scheme.Devanagari, Scheme.Slp1)
    got = {}
    kinds = []
    try:
        for tok in c.run(slp1):
            d = tok.data
            if d is None:
                continue
            tn = type(d).__name__
            if "Tinanta" in tn:
                t = LAK.get(str(d.lakara)); p = PUR.get(str(d.purusha)); n = VAC.get(str(d.vacana))
                if t and p and n:
                    got[f"V:{tok.lemma}"] = f"{t}.{p}{n}"
                kinds.append("V" if (t and p and n) else "V?")
            elif "Subanta" in tn:
                v = VIB.get(str(d.vibhakti)); n = VAC.get(str(d.vacana))
                if v and n:
                    got[f"N:{tok.lemma}"] = f"{v}.{n}"
                kinds.append("N" if (v and n) else "N?")
    except Exception as e:
        fails.append((dev, f"EXC {e}"))
        fail += 1
        continue
    # compare against accepted parses ignoring role names (roles differ: seeds use english roles, we get sanskrit lemmas)
    expected = [set(p.values()) for p in ch["accepted_parses"]]
    got_feats = set(got.values())
    matched = any(got_feats == e for e in expected)
    if matched:
        ok += 1
    else:
        fail += 1
        fails.append((dev, f"got={sorted(got_feats)} kinds={kinds} expected={[sorted(e) for e in expected]}"))

print(f"RESULT: {ok}/{ok+fail} feature-sets match (role-agnostic)")
for f in fails:
    print("FAIL", f[0], "->", f[1])
