"""Reviewed Home insights: original explanations with inspectable sources.

Research cards do not invent an ancient verse. Text cards quote only the
ancient passage and use original translations. Date collisions preserve
existing records; seeding never withdraws an owner's editorial decision.
"""
from datetime import date, timedelta
from app.models import FactCard

ARYA = "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/html/sa_AryabhaTa-AryabhaTIya.htm"
PROSODY = "https://sanskrit.uohyd.ac.in/Algorithms_in_Ancient_India/Material/mathforpoets.pdf"
INSIGHTS = [
    dict(id="curated-prosody-binary", fact="Eight rhythm patterns can encode three syllables: Sanskrit prosody explored this long before computers.", claim_kind="modern", text_name="Piṅgala's prosody", ref="Prastāra; Hall, pp. 2–4", devanagari="", iast="", translation="", explanation="Three positions, each short or long, give 2 × 2 × 2 = 8 patterns. Piṅgala's enumeration is comparable to binary counting; that comparison does not make him the inventor of modern computers.", source_url=PROSODY, source_site="Rachel Wells Hall · Math for Poets and Drummers"),
    dict(id="curated-prosody-fibonacci", fact="Counting short and long syllables produces the Fibonacci sequence. Hemacandra described the recurrence before Fibonacci.", claim_kind="modern", text_name="Indian prosody", ref="Hall, pp. 11–13", devanagari="", iast="", translation="", explanation="A short syllable takes one beat, a long one two. A pattern ends with one or the other, so the counts add: 1, 2, 3, 5, 8. Attribution to Piṅgala alone oversimplifies the earlier and medieval tradition.", source_url=PROSODY, source_site="Rachel Wells Hall · Math for Poets and Drummers"),
    dict(id="curated-arya-pi", fact="A Sanskrit verse gives a circle calculation that yields π ≈ 3.1416.", claim_kind="text", text_name="Āryabhaṭīya", ref="Gaṇitapāda 10", devanagari="चतुरधिकं शतमष्टगुणं द्वाषष्टिस्तथा सहस्राणाम्।\nअयुतद्वयविष्कम्भस्यासन्नो वृत्तपरिणाहः॥", iast="caturadhikaṃ śatam aṣṭaguṇaṃ dvāṣaṣṭis tathā sahasrāṇām", translation="Eight times 104, plus 62,000, approximates the circumference for diameter 20,000.", explanation="(104 × 8 + 62,000) ÷ 20,000 = 3.1416. The passage explicitly calls it approximate.", source_url=ARYA, source_site="GRETIL · Āryabhaṭīya, Shukla edition"),
    dict(id="curated-arya-boat", fact="Āryabhaṭa explains apparent motion using a passenger in a moving boat.", claim_kind="text", text_name="Āryabhaṭīya", ref="Golapāda 9", devanagari="अनुलोमगतिनौस्थः पश्यत्यचलं विलोमगं यद्वत्।\nअचलानि भानि तद्वत्समपश्चिमगानि लङ्कायाम्॥", iast="anulomagatinau-sthaḥ paśyaty acalaṃ vilomagaṃ yadvat", translation="Stationary objects seem to move backwards from a moving boat; he compares this with the stars' apparent westward motion.", explanation="A striking use of the observer's motion to explain the sky, centuries before modern physics.", source_url=ARYA, source_site="GRETIL · Āryabhaṭīya, Shukla edition"),
    dict(id="curated-arya-place-value", fact="Āryabhaṭa describes decimal place value in a single Sanskrit verse.", claim_kind="text", text_name="Āryabhaṭīya", ref="Gaṇitapāda 2", devanagari="एकं दश च शतं च सहस्रमयुतनियुते तथा प्रयुतम्।\nकोट्यर्बुदं च वृन्दं स्थानात्स्थानं दशगुणं स्यात्॥", iast="sthānāt sthānaṃ daśaguṇaṃ syāt", translation="From one place to the next, the value becomes tenfold.", explanation="The verse lists successive powers of ten. It describes place value, rather than claiming every later numerical innovation.", source_url=ARYA, source_site="GRETIL · Āryabhaṭīya, Shukla edition"),
    dict(id="curated-arya-longitude", fact="One Sanskrit astronomy verse connects sunrise, noon, sunset and midnight at different places.", claim_kind="text", text_name="Āryabhaṭīya", ref="Golapāda 13", devanagari="उदयो यो लङ्कायां सोऽस्तमयः सवितुरेव सिद्धपुरे।\nमध्याह्नो यमकोट्यां रोमकविषयेऽर्धरात्रः स्यात्॥", iast="udayo yo laṅkāyāṃ so'stamayaḥ savitur eva siddhapure", translation="Sunrise at Laṅkā corresponds to sunset, noon and midnight at the other named meridians.", explanation="These are the text's idealised geographical meridians, not today's civil time zones.", source_url=ARYA, source_site="GRETIL · Āryabhaṭīya, Shukla edition"),
]

def seed_home_insights(db):
    from app.services.iast import to_iast
    for index, fields in enumerate(INSIGHTS):
        row = db.get(FactCard, fields["id"])
        if row is not None and row.status == "withdrawn": continue
        if row is None:
            day = date(2026, 9, 1) + timedelta(days=index)
            while db.query(FactCard).filter(FactCard.scheduled_date == day.isoformat()).first(): day -= timedelta(days=1)
            row = FactCard(id=fields["id"], scheduled_date=day.isoformat(), status="approved", made_by="reviewed")
            db.add(row)
        for key, value in fields.items(): setattr(row, key, value)
        row.iast = to_iast(row.devanagari) if row.devanagari else ""
        row.checked_on = "2026-10-14"
        row.ref_key = "home-reviewed:" + fields["id"]
        db.flush()
