import "server-only";
import type { CorrespondenceArtefact } from "./types.ts";

/**
 * DEVELOPMENT / TEST-ONLY synthetic Correspondence collection fixtures.
 *
 * - Strictly isolated from `content/artifacts/correspondence.ts` and never
 *   imported by production routes (`app/(archive)/**`).
 * - Strictly unavailable in production (`NODE_ENV !== "development"` -> 404).
 * - Contains 34 raw entries: 32 approved synthetic test entries + 2 withheld
 *   synthetic entries (`TEST/II-004` and `TEST/II-015`) interleaved to test
 *   filtering, 404 direct-route blocking, and Previous/Next gapless skipping.
 * - Never includes the original private Hindi poem.
 */

const SYNTHETIC_FEATURED_ENTRIES: readonly CorrespondenceArtefact[] = [
  {
    id: "syn-corr-001",
    slug: "synthetic-devanagari-calibration-01",
    catalogNumber: "TEST/II-001",
    collectionOrder: 1,
    type: "poem",
    title: "परीक्षण कविता — कागज़ और स्याही",
    summary:
      "Synthetic Devanagari test fixture for verifying glyph shaping, matras, and stanza rhythm.",
    language: "hi",
    script: "Devanagari",
    createdAt: "2024-02-11",
    publishStatus: "ready",
    consentConfirmed: true,
    editorialNote:
      "Synthetic test entry only. Verifies Noto Serif Devanagari conjuncts, chandrabindu, nukta, and vertical spacing.",
    originalText: `यह एक कृत्रिम परीक्षण कविता है, जो केवल मुद्रण जाँच के लिए लिखी गई है,
कागज़ की गरमाहट और स्याही की स्पष्टता परखने का शांत अभ्यास।

क्षत्रिय, ज्ञान, श्रद्धा और चंद्रबिंदु वाले शब्दों की रेखाएँ यहाँ स्थिर हैं,
हर मात्रा, अर्ध-अक्षर और विराम चिह्न बिना किसी विरूपण के खुलता है।

धीमी रोशनी में पंक्तियाँ अपनी स्वाभाविक दूरी बनाए रखती हैं,
न कोई कंपन, न कोई सजावट — केवल स्पष्ट, स्थिर और पठनीय अक्षर।

जब अनुच्छेद बदलता है तो श्वेत स्थान पाठ को साँस लेने देता है,
यह केवल विकास परीक्षण के लिए निर्मित एक कृत्रिम साहित्यिक नमूना है।`,
    translations: [
      {
        language: "en",
        script: "Latin",
        languageLabel: "English",
        title: "Test Poem — Paper and Ink (Synthetic Translation)",
        text: `This is a synthetic test poem written solely for typographic verification,
a quiet exercise to inspect warm paper contrast and ink clarity.

Lines containing conjuncts, vowel marks, and punctuation remain steady here,
each glyph and pause opening cleanly without distortion.

Under quiet light the verses retain their natural vertical measure,
no motion, no ornament — only clear, steady, readable letterforms.

Where stanzas divide, open whitespace lets the reading breathe;
this is strictly a synthetic literary calibration fixture for development.`,
        translatorNote:
          "Synthetic companion translation verifying strict separation from the original Devanagari text.",
      },
    ],
  },
  {
    id: "syn-corr-002",
    slug: "synthetic-english-short-02",
    catalogNumber: "TEST/II-002",
    collectionOrder: 2,
    type: "poem",
    title: "Study in Warm Paper (Test Fixture)",
    language: "en",
    script: "Latin",
    createdAt: "2024-02-19",
    publishStatus: "ready",
    consentConfirmed: true,
    originalText: `Three quiet lines arranged upon warm paper,
testing the measure of serif ink at rest.
Nothing added where silence is enough.`,
  },
  {
    id: "syn-corr-003",
    slug: "synthetic-untitled-fragment-03",
    catalogNumber: "TEST/II-003",
    collectionOrder: 3,
    type: "fragment",
    sourceContext: "Synthetic untitled fragment fixture without a recorded date.",
    language: "en",
    script: "Latin",
    publishStatus: "ready",
    consentConfirmed: true,
    originalText: `A margin note preserved without a title or calendar date,
confirming that untitled fragments sit quietly in the catalogue
under their permanent catalogue reference alone.`,
  },
  {
    id: "syn-corr-004-withheld",
    slug: "synthetic-withheld-fixture-04",
    catalogNumber: "TEST/II-004",
    collectionOrder: 4,
    type: "poem",
    title: "SHOULD NEVER APPEAR — WITHHELD FIXTURE 04",
    language: "en",
    script: "Latin",
    publishStatus: "withheld",
    consentConfirmed: false,
    originalText:
      "SYNTHETIC WITHHELD SENTINEL TEXT 04 — MUST NEVER RENDER IN HTML OR NAVIGATION.",
  },
  {
    id: "syn-corr-005",
    slug: "synthetic-long-english-poem-05",
    catalogNumber: "TEST/II-005",
    collectionOrder: 5,
    type: "poem",
    title: "Long-Form Reading Room Calibration (Test Fixture)",
    summary:
      "Multi-stanza synthetic English fixture for verifying vertical scroll rhythm and Audio Dock clearance.",
    language: "en",
    script: "Latin",
    createdAt: "2024-03-04",
    publishStatus: "ready",
    consentConfirmed: true,
    originalText: `Stanza one opens on an unhurried margin,
where a long synthetic poem tests the vertical rhythm of paper.
Each line keeps its exact intentional break,
never collapsed, never re-wrapped into prose.

Stanza two measures the eye returning to the left edge,
steady across desktop columns and narrow handheld screens alike.
Comfortable spacing holds the ink from crowding,
so reading remains calm through twenty lines or eighty.

Stanza three checks how tall scrolls behave above the bottom dock:
the final navigation links must clear the audio bar cleanly,
never obscured by fixed controls at desktop or mobile widths.

Stanza four continues the long-form synthetic study,
testing quiet concentration over an extended reading span.
Warm paper light holds steady without grain or artificial frame,
letting typography carry the entire architecture of the room.

Stanza five turns toward spacing between verses,
confirming blank lines render as genuine stanza pauses.
The font scale remains legible without forced tightening,
and focus indicators remain crisp against the warm paper ground.

Stanza six adds depth to the vertical cadence,
ensuring long compositions do not feel compressed or rushed.
No kinetic splits, no animated fades per verse,
only a complete artefact held intact from first line to last.

Stanza seven checks line-length balance at 360px and 390px:
longer synthetic clauses wrap softly without horizontal overflow,
while short meditative lines hold their exact visual pause.

Stanza eight closes this synthetic calibration poem,
confirming that the reader returns cleanly to the catalogue
or advances directly to the next permitted literary artefact.`,
  },
  {
    id: "syn-corr-006",
    slug: "synthetic-mixed-script-06",
    catalogNumber: "TEST/II-006",
    collectionOrder: 6,
    type: "poem",
    title: "Two Scripts on One Page (Test Fixture)",
    language: "hi-en",
    script: "Mixed",
    createdAt: "2024-03-18",
    publishStatus: "ready",
    consentConfirmed: true,
    originalText: `Morning light crosses the desk,
और कागज़ पर अक्षर धीरे-धीरे उभरते हैं।

Between two vocabularies, one steady baseline,
शब्द और वाक्य बिना टकराए साथ चलते हैं।

No script is compressed to imitate the other,
दोनों अपनी-अपनी सहज लय में पढ़े जाते हैं।`,
  },
  {
    id: "syn-corr-007",
    slug: "synthetic-letter-07",
    catalogNumber: "TEST/II-007",
    collectionOrder: 7,
    type: "letter",
    title: "Archival Letter Layout Test (Test Fixture)",
    language: "en",
    script: "Latin",
    createdAt: "2024-04-02",
    publishStatus: "ready",
    consentConfirmed: true,
    salutation: "Dear Reader (Synthetic Test Salutation),",
    signOff: "With calm precision,\nSynthetic Calibration Suite",
    originalText: `This synthetic letter fixture verifies that correspondence letters share the same archival metadata backbone without being forced into a verse-only schema.

Paragraph breaks are preserved verbatim in plain text, and optional salutation and sign-off fields render quietly above and below the body without envelope illustrations or messaging chrome.

Longer letters can span multiple paragraphs while keeping the same unhurried measure and warm paper contrast as every poem in the collection.`,
  },
  {
    id: "syn-corr-008",
    slug: "synthetic-long-devanagari-08",
    catalogNumber: "TEST/II-008",
    collectionOrder: 8,
    type: "poem",
    title: "दीर्घ देवनागरी पठन परीक्षण (कृत्रिम नमूना)",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalText: `प्रथम अनुच्छेद — यह एक लंबा कृत्रिम देवनागरी परीक्षण पाठ है,
जिसका उद्देश्य लंबे पठन के दौरान पंक्ति-अंतराल और स्पष्टता की जाँच करना है।
संयुक्ताक्षर जैसे पृथ्वी, संस्कृति, दृष्टिकोण और साहित्य यहाँ स्वाभाविक रूप से जुड़ते हैं।

द्वितीय अनुच्छेद — मोबाइल और डेस्कटॉप दोनों पर्दों पर अक्षरों का आकार पर्याप्त रहता है,
शिरोरेखा के ऊपर लगी मात्राएँ तथा नीचे के उकार-ऊकार आपस में नहीं टकराते।
कृत्रिम अक्षर-अंतराल के बिना प्रत्येक शब्द अपनी सहज आकृति बनाए रखता है।

तृतीय अनुच्छेद — लंबे पाठ को पढ़ते समय पृष्ठ का रंग आँखों को थकाता नहीं,
हल्के गर्म कागज़ पर गहरी स्याही स्पष्ट पठनीयता प्रदान करती है।
हर अनुच्छेद के बीच पर्याप्त विश्राम और शांत संतुलन बना रहता है।

चतुर्थ अनुच्छेद — यह कविता किसी भी एनीमेशन में विभाजित नहीं की गई है,
संपूर्ण मूल पाठ एक साथ, बिना किसी परिवर्तन के सुरक्षित रूप से प्रस्तुत होता है।
यही साहित्यिक कक्ष की मर्यादा और इस परीक्षण का मुख्य लक्ष्य है।

पंचम अनुच्छेद — अंतिम पंक्तियाँ यह सुनिश्चित करती हैं कि नीचे का ऑडियो बार
किसी भी पाठ या अगले-पिछले पृष्ठ के नियंत्रण को ढकने न पाए।
यह पूर्णतः कृत्रिम विकास परीक्षण सामग्री है, कोई वास्तविक संग्रह रचना नहीं।`,
  },
  {
    id: "syn-corr-009",
    slug: "synthetic-other-marginalia-09",
    catalogNumber: "TEST/II-009",
    collectionOrder: 9,
    type: "other",
    customTypeLabel: "Marginalia",
    title: "Endpaper Marginalia Calibration (Test Fixture)",
    language: "en",
    script: "Latin",
    publishStatus: "ready",
    consentConfirmed: true,
    editorialNote:
      "Demonstrates extensible `type: \"other\"` artefacts with an explicit `customTypeLabel`.",
    originalText: `Pencil notation recorded inside a synthetic endpaper test plate:
verify that custom literary artefact types render cleanly in both
the editorial catalogue and the individual reader header.`,
  },
  {
    id: "syn-corr-010",
    slug: "synthetic-untitled-devanagari-10",
    catalogNumber: "TEST/II-010",
    collectionOrder: 10,
    type: "poem",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalText: `शीर्षक रहित कृत्रिम देवनागरी कविता का परीक्षण नमूना,
ताकि बिना शीर्षक और बिना तिथि वाली रचनाएँ भी
केवल सूची संख्या के साथ गरिमा से दिखाई दें।`,
  },
];

// Programmatically generate entries 11–34 (including withheld sentinel TEST/II-015)
// so the harness exercises 32 approved entries (34 raw) across mixed types, languages,
// dates, untitled entries, and translations — proving scalability for 30–50+ artefacts.
const SYNTHETIC_GENERATED_ENTRIES: readonly CorrespondenceArtefact[] = Array.from(
  { length: 24 },
  (_, offset): CorrespondenceArtefact => {
    const num = 11 + offset;
    const padded = String(num).padStart(3, "0");
    const catalogNumber = `TEST/II-${padded}`;

    if (num === 15) {
      return {
        id: `syn-corr-${padded}-withheld`,
        slug: `synthetic-withheld-fixture-${padded}`,
        catalogNumber,
        collectionOrder: num,
        type: "letter",
        title: "SHOULD NEVER APPEAR — WITHHELD FIXTURE 15",
        language: "en",
        script: "Latin",
        publishStatus: "withheld",
        consentConfirmed: false,
        originalText:
          "SYNTHETIC WITHHELD SENTINEL TEXT 15 — MUST NEVER APPEAR IN CATALOGUE OR READER.",
      };
    }

    const isUntitled = num % 7 === 0;
    const hasDate = num % 3 !== 0;
    const createdAt = hasDate
      ? `2024-${String(((num - 1) % 12) + 1).padStart(2, "0")}-${String(
          ((num * 3) % 27) + 1
        ).padStart(2, "0")}`
      : undefined;

    if (num % 5 === 0) {
      return {
        id: `syn-corr-${padded}`,
        slug: `synthetic-devanagari-plate-${padded}`,
        catalogNumber,
        collectionOrder: num,
        type: "poem",
        ...(isUntitled ? {} : { title: `कृत्रिम देवनागरी नमूना ${padded}` }),
        language: "hi",
        script: "Devanagari",
        ...(createdAt ? { createdAt } : {}),
        publishStatus: "ready",
        consentConfirmed: true,
        originalText: `कृत्रिम परीक्षण क्रमांक ${padded} — शांत कागज़ पर देवनागरी पाठ,
मात्राओं, विराम और अनुच्छेद दूरी की नियमित जाँच के लिए।

यह केवल विकास परीक्षण संग्रह का एक कृत्रिम उदाहरण है,
ताकि तीस से अधिक रचनाओं वाली सूची का संतुलन परखा जा सके।`,
        ...(num === 20
          ? {
              translations: [
                {
                  language: "en",
                  script: "Latin",
                  languageLabel: "English",
                  text: `Synthetic test entry ${padded} — Devanagari text upon quiet paper,
for verifying vowel marks, punctuation, and stanza spacing.

This is strictly a synthetic development fixture
for evaluating collections exceeding thirty literary entries.`,
                },
              ],
            }
          : {}),
      };
    }

    if (num % 6 === 0) {
      return {
        id: `syn-corr-${padded}`,
        slug: `synthetic-letter-fixture-${padded}`,
        catalogNumber,
        collectionOrder: num,
        type: "letter",
        ...(isUntitled
          ? {}
          : { title: `Synthetic Correspondence Sheet ${padded}` }),
        language: "en",
        script: "Latin",
        ...(createdAt ? { createdAt } : {}),
        salutation: `Calibration Note ${padded},`,
        signOff: "Synthetic Archive Harness",
        publishStatus: "ready",
        consentConfirmed: true,
        originalText: `Synthetic letter entry ${padded} testing scalability across thirty-plus artefacts in explicit collection order.

Each letter remains cleanly separated from verse formatting while keeping uniform catalogue identity and calm reading proportions.`,
      };
    }

    if (num % 4 === 0) {
      return {
        id: `syn-corr-${padded}`,
        slug: `synthetic-fragment-fixture-${padded}`,
        catalogNumber,
        collectionOrder: num,
        type: "fragment",
        ...(isUntitled
          ? {}
          : { title: `Synthetic Fragment Plate ${padded}` }),
        sourceContext: `Synthetic catalogue scalability fixture #${padded}.`,
        language: num % 8 === 0 ? "hi-en" : "en",
        script: num % 8 === 0 ? "Mixed" : "Latin",
        ...(createdAt ? { createdAt } : {}),
        publishStatus: "ready",
        consentConfirmed: true,
        originalText:
          num % 8 === 0
            ? `Synthetic mixed-script fragment ${padded},\nकागज़ और अक्षरों के संतुलन का छोटा परीक्षण।`
            : `Synthetic literary fragment ${padded} verifying catalogue density\nand individual reader routing without hardcoded collection limits.`,
      };
    }

    return {
      id: `syn-corr-${padded}`,
      slug: `synthetic-poem-fixture-${padded}`,
      catalogNumber,
      collectionOrder: num,
      type: "poem",
      ...(isUntitled ? {} : { title: `Synthetic Verse Study ${padded}` }),
      language: "en",
      script: "Latin",
      ...(createdAt ? { createdAt } : {}),
      publishStatus: "ready",
      consentConfirmed: true,
      originalText: `Synthetic test poem ${padded}, arranged in explicit collection order,
verifying that the Correspondence catalogue scales gracefully
past twenty-five and thirty entries without layout redesign.

Each individual artefact resolves on its own reading route,
holding steady margins, quiet hairlines, and clear navigation.`,
    };
  }
);

export const SYNTHETIC_CORRESPONDENCE_FIXTURES: readonly CorrespondenceArtefact[] =
  [...SYNTHETIC_FEATURED_ENTRIES, ...SYNTHETIC_GENERATED_ENTRIES];
