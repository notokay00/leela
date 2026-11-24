import type { CorrespondenceArtefact } from "../../lib/correspondence/types.ts";

/**
 * Verbatim preservation of the original Hindi/Urdu Devanagari poem
 * extracted from the legacy PrizeSlideshow component.
 * Spelling, punctuation, wording, and stanza breaks are intentionally untouched.
 */
export const ORIGINAL_FOR_YOU_POEM_TEXT = `तेरी आखों में जो देखा, वहाँ ठहरा है वक़्त,
ख़ुद को खोकर तुझमें मिल जाने की है चाहत।

बाहों की वो एक पनाह जो मुझको मिल गई,
उम्र भर का घर वहीं, मंज़िल वहीं ठहर गई।

जीना हो तेरे साथ तो हर साँस इबादत,
मरना भी तेरे साथ हो तो मौत भ राहत।

दो रूहें जब मिलें, बने इक जिस्म की सूरत,
मिट जाए फिर जीने-मरने की हर हद, हर सूरत।

तेरी नज़र का इक सुकून जो एक बार मिला,
उसके आगे जन्नत का ख़याल भी फीका लगा।

बस इतनी सी दआ है, इतनी सी है आरज़ू,
तेरे साथ जीना हो, तेरे साथ ही फ़ना हो जाना हो।`;

/**
 * Production Correspondence (`AU/II`) literary collection registry.
 *
 * Scalable data-driven registry designed for 25–50+ literary artefacts without
 * layout or component rewrites. Every entry defaults to:
 *   publishStatus: "withheld"
 *   consentConfirmed: false
 * and is independently filtered before entering the catalogue or reader routes.
 */
export const CORRESPONDENCE_ARTIFACTS: readonly CorrespondenceArtefact[] = [
  {
    id: "correspondence-001",
    slug: "for-you-poem",
    catalogNumber: "AU/II-001",
    collectionOrder: 1,
    type: "poem",
    title: "For You",
    language: "hi",
    script: "Devanagari",
    publishStatus: "withheld",
    consentConfirmed: false,
    pairedArtifactSlug: "leela-poem-film",
    editorialNote:
      "Preserved verbatim from the earliest version of the archive.",
    originalText: ORIGINAL_FOR_YOU_POEM_TEXT,
  },
];
