# Word origins checked at the source

Written 2026-10-02. The look-ups were made on 2026-10-01 for the Home "word" idea: words in other
languages that go back to a Sanskrit word, shown with the route they took.

This file is the checked list, nothing else. It can be the first batch of content, and it can be
the test set for any model that is asked to find such words (the "held back" section is as useful
there as the "kept" section).

**How each line was checked.** I opened the dictionary entry named on the line and read it through
a page reader. Nothing here is from memory, from Wikipedia or from a search summary. Two limits:

- The reader returns a summary of the page, so the spelling of an intermediate form (a diacritic on
  a Persian, Arabic or Greek word) may be slightly off. Copy each form from the entry itself before
  it is shown to a learner.
- I did not read printed editions. "Monier-Williams" below means the Cologne digitisation.

---

## 1. The dictionaries

Titles are quoted as each site gives them (read 2026-10-02).

| Key | Dictionary | Entry address |
|---|---|---|
| `mw` | "Monier-Williams Sanskrit-English Dictionary" (1899), Cologne Digital Sanskrit Dictionaries, Cologne University | `https://www.sanskrit-lexicon.uni-koeln.de/scans/csl-apidev/getword.php?dict=mw&key=<SLP1>&input=slp1&output=roman` |
| `ahd` | "The American Heritage Dictionary of the English Language, Fifth Edition copyright 2022 by HarperCollins Publishers" | `https://ahdictionary.com/word/search.html?q=<word>` |
| `pfeifer` | "Wolfgang Pfeifer et al., Etymologisches Wörterbuch des Deutschen (1993), digitalisierte und von Wolfgang Pfeifer überarbeitete Version im Digitalen Wörterbuch der deutschen Sprache" | `https://www.dwds.de/wb/etymwb/<Word>` |
| `duden` | Duden online, copyright Cornelsen Verlag GmbH | `https://www.duden.de/rechtschreibung/<Word>` |
| `vasmer` | "Этимологический словарь русского языка Макса Фасмера", read at gufo.me | `https://gufo.me/dict/vasmer/<word, URL-encoded>` (ё is written е in the address) |
| `platts` | "Platts, John T. A dictionary of Urdu, classical Hindi, and English. London: W. H. Allen & Co., 1884", Digital Dictionaries of South Asia, University of Chicago | `https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?qs=<Devanagari>&searchhws=yes` |

Notes on rights, as read on the sites: the Platts digitisation is under CC BY-NC-ND 2.0. The Cologne
front page shows no licence statement. So cite these works and write our own wording; do not copy
entry text into the app.

Monier-Williams marks where a word is found with abbreviations. The ones used below, confirmed
against a transcription of the dictionary's own list (`sanskritdocuments.org/dict/MWabbreviations.html`,
read 2026-10-02): RV. Ṛg-veda, AV. Atharva-veda, VS. Vājasaneyi-saṃhitā, TS. Taittirīya-saṃhitā,
ŚBr. Śatapatha-brāhmaṇa, Up. Upaniṣad, Nir. Nirukta, Mn. Manu's law-book, Yājñ. Yājñavalkya,
MBh. Mahā-bhārata, R. Rāmāyaṇa, Suśr. Suśruta, Kāv. Kāvya literature, Var. Varāha-mihira,
VarBṛS. Varāha-mihira's Bṛhat-saṃhitā, Kathās. Kathā-sarit-sāgara, Śak. Śakuntalā,
Śiś. Śiśupāla-vadha, Kir. Kirātārjunīya, Megh. Megha-dūta, Naiṣ. Naiṣadha-carita,
Sāh. Sāhitya-darpaṇa, KātyŚr. Kātyāyana's Śrauta-sūtra, Kum. Kumāra-sambhava,
ŚārṅgP. Śārṅgadhara-paddhati, RPrāt. Ṛgveda-prātiśākhya, ĀśvGṛ. and PārGṛ. the Gṛhya-sūtras of
Āśvalāyana and Pāraskara. **L.** means lexicographers: a word or meaning given in native lexicons but
not yet met in a published text. **R. is the Rāmāyaṇa, not the Ṛg-veda.** ChUp. and Bhpr. are not on
that page as such, so they are left unexpanded here.

---

## 2. Rules used

- **Loan** means the dictionary of the other language derives its word from the Sanskrit word. The
  stops between are listed from the Sanskrit side outward. No stops means borrowed directly.
- **Related** means the dictionary calls the two words relatives from one older language. It is not
  a borrowing in either direction. A related route may have stops of its own: "ignite" comes from
  Latin *ignis*, and *ignis* is the relative of *agni*.
- **Certain** or **probable** follows the dictionary's own hedge. When dictionaries differ on the
  step into Sanskrit, every route of that word takes the more cautious label.
- A word is **held back** when dictionaries disagree about whether Sanskrit is the source at all,
  or when the dictionary read does not carry the route as far as Sanskrit.
- "Akin to" in the American Heritage Dictionary and "родственно" in Vasmer mean related, not
  derived. "Wohl", "vielleicht", "vermutlich", "wahrscheinlich" in Pfeifer, "probably", "perhaps",
  "possibly" in American Heritage and "вероятно" in Vasmer are hedges.

---

## 3. Sanskrit forms (run, not typed)

Devanagari and roman below were produced from the Monier-Williams key with `vidyut.lipi` in
`backend/.venv` (run 2026-10-01). The citation form is the nominative singular; each one listed was
confirmed with the Vidyut kosha as a first-case singular of that stem (run). Where no citation form
is listed, the kosha could not confirm one and the stem stands.

| Key | Devanagari | Roman | Citation form |
|---|---|---|---|
| `SarkarA` | शर्करा | śarkarā | |
| `jaNgala` | जङ्गल | jaṅgala | |
| `pippalI` | पिप्पली | pippalī | |
| `upala` | उपल | upala | |
| `nIla` | नील | nīla | |
| `lAkzA` | लाक्षा | lākṣā | |
| `mantrin` | मन्त्रिन् | mantrin | `mantrI` मन्त्री mantrī |
| `DyAna` | ध्यान | dhyāna | |
| `candana` | चन्दन | candana | |
| `yoga` | योग | yoga | |
| `nAraNga` | नारङ्ग | nāraṅga | |
| `guru` | गुरु | guru | |
| `KaRqa` | खण्ड | khaṇḍa | |
| `kajjala` | कज्जल | kajjala | |
| `SfgAla` | शृगाल | śṛgāla | |
| `karman` | कर्मन् | karman | `karma` कर्म karma |
| `kfmi` | कृमि | kṛmi | |
| `nirvARa` | निर्वाण | nirvāṇa | |
| `Asana` | आसन | āsana | |
| `mAtf` | मातृ | mātṛ | `mAtA` माता mātā |
| `agni` | अग्नि | agni | |
| `nava` | नव | nava | |
| `BrAtf` | भ्रातृ | bhrātṛ | `BrAtA` भ्राता bhrātā |
| `hima` | हिम | hima | |
| `nAman` | नामन् | nāman | `nAma` नाम nāma |
| `nakta` | नक्त | nakta | |
| `pitf` | पितृ | pitṛ | `pitA` पिता pitā |
| `maDu` | मधु | madhu | |
| `sUnu` | सूनु | sūnu | |
| `dama` | दम | dama | |
| `svasf` | स्वसृ | svasṛ | `svasA` स्वसा svasā |
| `nO` | नौ | nau | |
| `duhitf` | दुहितृ | duhitṛ | `duhitA` दुहिता duhitā |
| `dvAr` | द्वार् | dvār | |

Trap seen while running this: the kosha returns verb forms too. `anAnAsam` matched as a form of the
root *nās*, not as a noun. Always check that a hit is a noun form of the stem you mean.

---

## 4. Kept: 34 Sanskrit words, 79 routes

Each word: key, meaning (in our words), where Monier-Williams cites it, then the routes.
A route reads: language, word, label, stops from the Sanskrit side, dictionary.

### Loans

**śarkarā** `SarkarA`. Grit, gravel; later ground sugar. Cited: AV. for gravel; Kāv., VarBṛS., Suśr. for sugar.
- English **sugar**, certain: Persian *shakar* → Arabic *sukkar* → Old Italian *zucchero* → Medieval Latin *succārum* → Old French *sukere* → Middle English *sugre*. `ahd`
- German **Zucker**, certain: Arabic *sukkar* → Italian *zucchero* → German *zucker* (13th century). `pfeifer`
- Russian **сахар** (sakhar), certain: Pali *sakkharā* → Greek *sákcharon*. `vasmer`

**jaṅgala** `jaNgala`. Dry, thinly grown land. Cited: *jaṅgala* from lexicons only (L.); *jāṅgala* from Mn., Yājñ., Suśr.
- English **jungle**, certain: Hindi *jaṅgal*. `ahd` says ultimately from Sanskrit; the Hindi step is from `pfeifer`.
- German **Dschungel**, certain: Hindi *jaṅgal* → English *jungle* (German from the 19th century). `pfeifer`
- Russian **джунгли** (dzhungli), certain: Hindi *jangal* → German *Dschungel* or English *jungle*. `vasmer`
- Also read: Hindi जंगल is from Sanskrit *jāṅgala*. `platts`

**pippalī** `pippalI`. Long pepper. Cited: R., Suśr., Var.
- English **pepper**, certain: a spoken Indian form close to Prakrit *pipparī* → Greek *peperi* → Latin *piper* → Old English *pipor* → Middle English *peper*. `ahd`
- German **Pfeffer**, certain: Greek *péperi* → Latin *piper* → Old High German *pheffur* (8th century). `pfeifer`
- Russian **перец** (perets), certain: Greek *péperi* → Latin *piper*. `vasmer`

**upala** `upala`. Stone; also a gem. Cited: MBh., Suśr., Śak. for stone; Yājñ., Śiś., Kir. for gem.
- English **opal**, probable: Greek *opallios* → Latin *opalus* → Middle French *opale*. `ahd` says "probably".
- German **Opal**, probable: Greek *opállios* → Latin *opalus* → French *opale* (German from the 17th century). `pfeifer` has no hedge; lowered to match.
- Russian **опал** (opal), probable: Greek *opállios* → Latin *opalus* → German *Opal* or French *opale*. `vasmer` has no hedge; lowered to match.

**nīla** `nIla`. Dark, dark blue; *nīlī* is the indigo plant. Cited: *nīla* from RV.; *nīlī* from Mn., Var., Suśr.
- English **lilac**, certain: *nīlī* → Middle Persian *nīl* (indigo) → Middle Persian *nīlak* → Arabic *līlak* → French *lilac* (obsolete). `ahd`
- German **lila**, certain: Persian *līlaǧ* → Arabic *līlāk* → French *lilas*. `pfeifer`
- German **Anilin**, certain: *nīlī* → Persian *nīl* → Arabic *an-nīl* → Portuguese *anil*; the substance was named in 1840. `pfeifer`

**lākṣā** `lAkzA`. Lac, a red dye. Cited: AV., Mn., MBh.
- English **lac**, certain: Prakrit *lakkhā* → Arabic *lakk* → Medieval Latin *lacca* → Old French *lacce* → Dutch *lac* or French *laque*. `ahd`. English *lacquer* goes back to the same Arabic word (`ahd`, entry "lacquer").
- German **Lack**, certain: Persian *lāk* → Arabic *lakk* → Medieval Latin *lacca* → Italian *lacca*. `pfeifer`
- Russian **лак** (lak), certain: Prakrit *lakkha* → Hindi *lākh* → Arabic *lakk* → Italian *lacca* → German *Lack*, Dutch *lak* or French *laque*. `vasmer` goes back to Hindi; `platts` takes Hindi *lākh* to the Sanskrit.

**mantrin** `mantrin`. Counsellor, minister. Cited: VS., Mn., MBh. among others.
- English **mandarin**, certain: Malay *menteri* → Portuguese *mandarim* → Spanish *mandarín*. `ahd`
- German **Mandarin**, certain: Hindi *mantrī* → Malay *mantari* → Portuguese *mandarim* (1514). `pfeifer`
- Russian **мандарин** (mandarin), the fruit, certain: Portuguese *mandarim* → French *mandarine*. `vasmer`, which names the fruit after the official.

**dhyāna** `DyAna`. Meditation. Cited: ChUp., Mn., MBh., Kāv.
- English **Zen**, certain: Pali *jhāna* → Early Middle Chinese *dʑian* → Japanese *zen*. `ahd`
- German **Zen**, certain: Chinese *chan* → Japanese *zen*. `duden`

**candana** `candana`. The sandal tree and its wood. Cited: Nir., MBh., R.
- English **sandalwood**, certain: Middle Persian *čandal* → Late Greek *santalon* → Medieval Latin *sandalum* → Old French *sandale* → Middle English *sandal*. `ahd` (second entry "sandal"), which adds that the Sanskrit word is of Dravidian origin.
- German **Sandelholz**, certain: Arabic *ṣandal* → Greek *sántalon* → Medieval Latin *santalum* → Italian *santalo* (German from the 15th century). `pfeifer` names the Arabic and the Old Indic together, after the Greek.
- Russian **сандал** (sandal), certain: Arabic *ṣandal* → Greek *sántalon*. `vasmer`

**yoga** `yoga`. Yoking, joining; later the discipline. Cited: RV., MBh. for yoking; Up., MBh., Kāv. for meditation.
- English **yoga**, certain: Hindi *yoga*. `ahd`
- German **Yoga**, certain: no stops. `duden`

**nāraṅga** `nAraNga`. The orange tree. Cited: Suśr., ŚārṅgP.
- English **orange**, certain: Persian *nārang* → Arabic *nāranj* → Old Italian *arancio* → Old French *orenge*. `ahd`, which adds that the Sanskrit word is possibly of Dravidian origin.

**guru** `guru`. Heavy; a teacher. Cited: RV., AV. for heavy; RPrāt., ĀśvGṛ., PārGṛ., Mn. for teacher.
- English **guru**, certain: Hindi *guru*. `ahd`
- German **Guru**, certain: Hindi *guru*. `duden`
- English **gravity**, related: Latin *gravis* (heavy) → Latin *gravitās* → French *gravité*. `ahd` for the English; `mw` lists Latin *gravis* as a relative of *guru*.

**khaṇḍa** `KaRqa`. A piece; later candied sugar. Cited: R., Suśr., Megh. for a piece; Bhpr., Naiṣ., Sāh. for sugar.
- English **candy**, certain: *khaṇḍaka* → an Indian form close to Pali *kaṇḍa* → Arabic *qand* (lump of sugar) → Arabic *qandī* → Old French *sucre candi* → Middle English *candi*. `ahd`, which adds that the Sanskrit word is perhaps of Munda origin.

**kajjala** `kajjala`. Lampblack for the eyes. Cited: Suśr., Kathās.
- German **Kajal**, certain: no stops. `duden` gives the origin as Sanskrit. Also read: Hindi *kājal* is from Sanskrit *kajjala*. `platts`

**śṛgāla** `SfgAla`. Jackal. Monier-Williams has its main entry under *sṛgāla*, cited from ŚBr.
- English **jackal**, probable: Middle Indic *sigāl* → Persian *šaghāl* → Turkish *çakal*. `ahd`
- German **Schakal**, probable: Persian *šaġāl* (German from the 17th century, perhaps through French). `pfeifer` hedges and calls the earlier history uncertain; this sets the label for all three.
- Russian **шакал** (shakal), probable: Persian *šaɣāl* → German *Schakal* or French *chacal* (18th century). `vasmer`

**karman** `karman`. Act, deed. Cited: RV., AV., ŚBr., MBh.
- English **karma**, certain: no stops. `ahd`
- German **Karma**, certain: no stops. `duden`

**kṛmi** `kfmi`. Worm, insect. Cited: VS., TS., AV., ŚBr., Mn.
- English **crimson**, probable: *kṛmi-ja* (made by worms) → Arabic *qirmiz* (the kermes insect) → Arabic *qirmizī* → Old Spanish *cremesín* → Middle English *cremesin*. `ahd`, entries "crimson" and "kermes"; the hedge is "probably".
- German **Karmesin**, probable: Persian *kirm* → Arabic *qirmiz* → Italian *carmesino* (German from the 15th century). `pfeifer`; the hedge is "höchstwahrscheinlich".

**nirvāṇa** `nirvARa`. Blown out; extinction. Cited: MBh., Kāv.
- English **nirvana**, certain: no stops. `ahd`
- German **Nirwana**, certain: no stops. `duden`

**āsana** `Asana`. Sitting; a seat; a posture. Cited: KātyŚr., Mn. for sitting; ŚBr., Kum., Mn. for a seat.
- English **asana**, certain: no stops. `ahd`

### Related

For these, Monier-Williams itself lists the relatives in its entry; the Russian word is confirmed in
Vasmer, who calls each one related, not borrowed.

| Sanskrit | Key | Meaning | Cited | English | German | Russian |
|---|---|---|---|---|---|---|
| mātṛ | `mAtf` | mother | RV. | mother `mw` | Mutter `mw` | мать (mat') `vasmer` |
| bhrātṛ | `BrAtf` | brother | RV. | brother `mw` | Bruder `mw` | брат (brat) `vasmer` |
| pitṛ | `pitf` | father | RV. | father `mw` | Vater `mw` | |
| sūnu | `sUnu` | son | RV. | son `mw` | Sohn `mw` | сын (syn) `vasmer` |
| svasṛ | `svasf` | sister | RV. | sister `mw` | Schwester `mw` | сестра (sestra) `vasmer` |
| duhitṛ | `duhitf` | daughter | none shown | | Tochter `pfeifer` | дочь (doch') `vasmer` |
| nāman | `nAman` | name | RV., VS., AV. | name `mw` | | имя (imya) `vasmer` |
| nava | `nava` | new, fresh | RV. | new `mw` | neu `mw` | новый (novyy) `vasmer` |
| nakta | `nakta` | night | RV., AV. | night `mw` | Nacht `mw` | ночь (noch') `vasmer` |
| madhu | `maDu` | sweet; honey; mead | RV., TS., AV. | mead `mw` | | мёд (myod), honey `vasmer` |
| hima | `hima` | cold, frost, snow | RV., VS., AV. | | | зима (zima), winter `vasmer` |
| dvār | `dvAr` | door, gate | RV., AV., ŚBr. | | Tür `pfeifer` | дверь (dver') `vasmer` |
| agni | `agni` | fire | none for the main sense | ignite, see below | | огонь (ogon') `vasmer` |
| dama | `dama` | house, home | RV., AV. | domestic, see below | | дом (dom) `vasmer` |
| nau | `nO` | ship, boat | RV. | navigate, navy, see below | | |

Related routes that pass through a relative:
- English **ignite**: Latin *ignis* (fire) → Late Latin *ignīre*. `ahd`; `mw` lists Latin *ignis* as a relative of *agni*.
- English **domestic**: Latin *domus* (house) → Latin *domesticus* → Old French *domestique*. `ahd`; `mw` lists Latin *domus* as a relative of *dama*.
- English **navigate**: Latin *nāvis* (ship) → Latin *nāvigāre*. `ahd`; `mw` lists Latin *nāvis* as a relative of *nau*.
- English **navy**: Latin *nāvis* → Latin *nāvigāre* → Latin *nāvigium* → Old French *navie*. `ahd`, with the same relative.

Russian in roman letters above follows one fixed table (х kh, ж zh, ш sh, ч ch, ц ts, щ shch, ы y,
й y, ё yo, ю yu, я ya, ь an apostrophe, ъ dropped), not a dictionary.

---

## 5. Held back or rejected

| Word | What the source says | Read in |
|---|---|---|
| ananas (pineapple) | Not Sanskrit. No entry in eight Sanskrit dictionaries; Monier-Williams's English–Sanskrit dictionary (1851) only suggests a form that "may be used"; Jahangir describes the fruit as coming from the ports of the Europeans. | Cologne dictionaries, Tūzuk-i-Jahāngīrī |
| navigation from "navgati" | False. Latin *nāvis* + *agere*. The true link is kinship, shown under *nau* above. | `ahd` |
| Russian яма (pit) and Yama | No link. Proto-Slavic word, compared with Greek and Baltic forms. | `vasmer` |
| Russian Мокша (river, people) and mokṣa | No link. A Mordvin name. | `vasmer` |
| tithi, asana as German words | Not headwords in the German dictionaries read. | DWDS, `duden` |
| camphor, Kampfer, камфора | Dictionaries disagree. Pfeifer derives it from Old Indic *karpūra*; Vasmer says "probably"; American Heritage says possibly from Malay and only akin to the Sanskrit. | `pfeifer`, `vasmer`, `ahd` |
| musk, Moschus, мускус | Dictionaries disagree. American Heritage says "probably" from *muṣka*; Pfeifer says the Persian word is related and hardly a borrowing; Vasmer derives it. | `ahd`, `pfeifer`, `vasmer` |
| rice, Reis | Latin *oryza* is treated as a borrowing from Iranian. Sanskrit *vrīhi* is the Indian counterpart, not the source. | `pfeifer` |
| ginger, Ingwer | From a Middle Indic form of Dravidian origin. The Sanskrit *śṛṅgavera* is a reshaping after the word for horn. | `pfeifer` |
| Brille, beryl | Greek *bēryllos* is given a Dravidian origin, probably a city name. No Sanskrit step. | `pfeifer` |
| German Orange | The entry stops at Persian. English *orange* is kept, from `ahd`. | `pfeifer` |
| German Kandis | The entry stops at Arabic. English *candy* is kept, from `ahd`. | `duden` |
| punch, Punsch | Only conjectured in Pfeifer and "probably" in American Heritage, with two different explanations; the Sanskrit numeral's citation form could not be confirmed with the kosha. | `pfeifer`, `ahd` |
| hibernate and hima | Likely, but the link sits in a part of American Heritage I did not open. | not read |
| English door, daughter; German Name, Met | Likely relatives, but the entry read does not name the modern word. Add after reading Pfeifer or American Heritage for each. | not read |
| sine from jyā; kavi, saṃsāra, mokṣa in Russian; every Persian word | Not checked in a dictionary of record. Encyclopaedia Iranica refused the reader. | not read |
