import type {
  DocumentArtifact,
  LetterArtifact,
  PoetryArtifact,
} from "@/content/types";

export type CorrespondenceArtifact =
  | PoetryArtifact
  | LetterArtifact
  | DocumentArtifact;

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

export const CORRESPONDENCE_ARTIFACTS: readonly CorrespondenceArtifact[] = [
  {
    slug: "for-you-poem",
    catalogId: "ARC-II-01",
    movement: "correspondence",
    kind: "poetry",
    title: "For You",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    pairedArtifactSlug: "leela-poem-film",
    curatorialNote:
      "Preserved verbatim from the earliest version of the archive.",
    rawText: ORIGINAL_FOR_YOU_POEM_TEXT,
    stanzas: ORIGINAL_FOR_YOU_POEM_TEXT.split("\n\n").map((stanza) =>
      stanza.split("\n")
    ),
  },
];
